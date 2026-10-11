package vn.syp.tms.ai;

import com.fasterxml.jackson.databind.*;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.sun.net.httpserver.HttpServer;
import jakarta.annotation.PreDestroy;
import jakarta.servlet.http.HttpSession;
import java.net.*;
import java.nio.charset.StandardCharsets;
import java.security.*;
import java.time.*;
import java.util.*;
import java.util.concurrent.*;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.concurrent.locks.ReentrantLock;
import java.util.function.Supplier;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import vn.syp.tms.identity.SessionPrincipal;
import vn.syp.tms.shared.web.BusinessException;

/** One explicitly configured local TMS owner; never a shared ChatGPT token broker. */
@Service
public class ChatGptConnectionService {
    public record Connection(String id, long version, String state, boolean planPermission, String accountLabel,
                             String verifiedModel, Instant verifiedAt, String failureCode) {}
    public record Authorization(String attemptId, String authorizationUrl, String state, Instant expiresAt) {}
    public record AttemptView(String attemptId, String state, Instant expiresAt, String failureCode) {}
    public record Probe(String requestKey, String model, String state, String failureCode, Instant completedAt) {}
    public record Disconnect(boolean disconnected, boolean remoteRevoked, String message) {}

    private final LocalAiConfiguration config;
    private final LocalAiAccess access;
    private final ChatGptCredentialVault vault;
    private final ChatGptOAuthClient oauth;
    private final ChatGptPlanClient client;
    private final ObjectMapper json;
    private final Clock clock;
    private final ReentrantLock stateLock = new ReentrantLock();
    private final ReentrantLock refreshLock = new ReentrantLock();
    private final AtomicInteger pendingSettlements = new AtomicInteger();
    private final ScheduledExecutorService settlements = Executors.newSingleThreadScheduledExecutor(task -> {
        Thread worker = new Thread(task, "chatgpt-local-settlement");
        worker.setDaemon(true);
        return worker;
    });
    private ObjectNode saved;
    private final Map<String, Attempt> attempts = new LinkedHashMap<>();
    private List<AiProviderGateway.Model> catalog = List.of();
    private long catalogVersion = -1;

    private static final class Attempt {
        String id, owner, state, nonce, verifier, redirect, clientId, subject, failure;
        String status = "PENDING";
        Instant expires;
        HttpServer server;
        HttpSession session;
        SessionPrincipal principal;
    }

    @org.springframework.beans.factory.annotation.Autowired
    public ChatGptConnectionService(LocalAiConfiguration config, LocalAiAccess access, ChatGptCredentialVault vault,
            ChatGptOAuthClient oauth, ChatGptPlanClient client, ObjectMapper json) {
        this(config, access, vault, oauth, client, json, Clock.systemUTC());
    }

    ChatGptConnectionService(LocalAiConfiguration config, LocalAiAccess access, ChatGptCredentialVault vault,
            ChatGptOAuthClient oauth, ChatGptPlanClient client, ObjectMapper json, Clock clock) {
        this.config = config;
        this.access = access;
        this.vault = vault;
        this.oauth = oauth;
        this.client = client;
        this.json = json;
        this.clock = clock;
        JsonNode prior = config.chatgptEnabled ? vault.read() : null;
        saved = prior == null ? json.createObjectNode() : (ObjectNode) prior;
        boolean dirty = false;
        for (var probe : saved.path("probes")) {
            if ("GENERATING".equals(probe.path("state").asText())) {
                ((ObjectNode) probe).put("state", "FAILED").put("failureCode", "AI_INTERRUPTED");
                dirty = true;
            }
        }
        if (dirty) vault.write(saved);
    }

    /** No wait queue, and provider I/O never owns this short state/completion fence. */
    private <T> T locked(Supplier<T> action) {
        ProviderHttp.requireTimeRemaining();
        if (pendingSettlements.get() != 0 || !stateLock.tryLock()) throw failure("AI_BUSY");
        try {
            if (pendingSettlements.get() != 0) throw failure("AI_BUSY");
            ProviderHttp.requireTimeRemaining();
            return action.get();
        }
        finally { stateLock.unlock(); }
    }

    /** Retain consumed provider outcomes independently of the caller's remaining wait budget.
     * New work cannot pass admission until all outcomes have been applied or version-fenced.
     * Only local state/session/vault work runs here; never provider network I/O. */
    private <T> T settle(Supplier<T> action) {
        var result = new CompletableFuture<T>();
        pendingSettlements.incrementAndGet();
        settlements.execute(() -> applySettlement(action, result));
        try {
            return result.get(ProviderHttp.remainingNanos(), TimeUnit.NANOSECONDS);
        } catch (TimeoutException e) {
            // Do not cancel the retained outcome when its originating request times out.
            throw failure("AI_UNAVAILABLE");
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw failure("AI_INTERRUPTED");
        } catch (ExecutionException e) {
            if (e.getCause() instanceof RuntimeException cause) throw cause;
            throw failure("AI_UNAVAILABLE");
        }
    }

    private <T> void applySettlement(Supplier<T> action, CompletableFuture<T> result) {
        T value = null;
        RuntimeException error = null;
        boolean retry = false;
        stateLock.lock(); // Background settlement may wait; the originating request never waits beyond its deadline.
        try {
            value = action.get();
        } catch (RuntimeException e) {
            error = e;
            retry = e instanceof OpenAiResponsesClient.Failure f && "AI_CREDENTIAL_STORE_FAILED".equals(f.code());
        } finally {
            if (!retry) pendingSettlements.decrementAndGet();
            stateLock.unlock();
        }
        if (retry) {
            // Keep admission closed and retain the outcome across transient local persistence failures.
            settlements.schedule(() -> applySettlement(action, result), 1, TimeUnit.SECONDS);
            result.completeExceptionally(error);
        } else if (error != null) result.completeExceptionally(error);
        else result.complete(value);
    }

    public Connection connection(String actor) {
        access.requireLocal(actor);
        return locked(this::view);
    }

    private Connection view() {
        String state;
        if (saved.path("reconnectRequired").asBoolean()) state = "RECONNECT_REQUIRED";
        else if (!saved.hasNonNull("accessToken")) state = "DISCONNECTED";
        else if (!permission()) state = "MISSING_PERMISSION";
        else state = saved.hasNonNull("verifiedAt") ? "VERIFIED" : "UNVERIFIED";
        return new Connection(saved.path("id").asText(null), saved.path("version").asLong(), state,
                permission(), saved.path("accountLabel").asText(null), saved.path("verifiedModel").asText(null),
                instant("verifiedAt"), saved.path("failureCode").asText(null));
    }

    private Instant instant(String field) {
        return saved.hasNonNull(field) ? Instant.parse(saved.path(field).asText()) : null;
    }

    public Authorization start(String actor, boolean newAccount) { return start(actor, newAccount, false); }

    public Authorization start(String actor, boolean newAccount, boolean enablePlanPermission) {
        HttpSession session = access.requireLocal(actor);
        return ProviderHttp.bounded(() -> locked(() -> {
            expireLocked();
            if (attempts.values().stream().anyMatch(a -> active(a.status))) throw conflict("AI_CONNECT_PENDING");
            if (attempts.size() >= 5)
                throw new BusinessException(429, "AI_REQUEST_LIMIT", "Too many connection attempts. Try again later.");
            if (enablePlanPermission && (newAccount || !saved.hasNonNull("clientId") || !saved.hasNonNull("subject")))
                throw new BusinessException(422, "AI_INVALID_INPUT", "Plan consent requires an existing verified registration.");
            Attempt attempt = new Attempt();
            attempt.id = UUID.randomUUID().toString();
            attempt.owner = actor;
            attempt.session = session;
            attempt.principal = access.current(actor);
            attempt.state = random();
            attempt.nonce = random();
            attempt.verifier = random();
            attempt.expires = Instant.now().plusSeconds(300);
            JsonNode pending = saved.path("pendingRegistration");
            boolean recoverPending = !newAccount && !enablePlanPermission && actor.equals(pending.path("owner").asText())
                    && pending.hasNonNull("clientId");
            attempt.clientId = recoverPending ? pending.path("clientId").asText() :
                    !newAccount && saved.hasNonNull("clientId") ? saved.path("clientId").asText() : "dynamic_agent_client";
            attempt.subject = !recoverPending && !newAccount ? saved.path("subject").asText(null) : null;
            try {
                startListener(attempt);
                attempts.put(attempt.id, attempt);
                var params = new LinkedHashMap<String, String>();
                params.put("client_id", attempt.clientId);
                if ("dynamic_agent_client".equals(attempt.clientId)) params.put("agent_name_hint", "SY Partners TMS");
                if (enablePlanPermission) params.put("prompt", "consent");
                params.put("ext_agent_host_id", config.hostId);
                params.put("response_type", "code");
                params.put("redirect_uri", attempt.redirect);
                params.put("scope", ChatGptOAuthClient.SCOPES);
                params.put("resource", ChatGptOAuthClient.RESOURCE);
                params.put("state", attempt.state);
                params.put("nonce", attempt.nonce);
                params.put("code_challenge_method", "S256");
                params.put("code_challenge", challenge(attempt.verifier));
                return new Authorization(attempt.id, "https://auth.openai.com/api/accounts/authorize?" +
                        ChatGptOAuthClient.form(params), attempt.status, attempt.expires);
            } catch (Exception e) {
                if (attempt.server != null) attempt.server.stop(0);
                throw failure("AI_UNAVAILABLE");
            }
        }));
    }

    private void startListener(Attempt attempt) throws java.io.IOException {
        attempt.server = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
        attempt.redirect = "http://127.0.0.1:" + attempt.server.getAddress().getPort() + "/auth/callback";
        attempt.server.createContext("/auth/callback", exchange -> {
            int status = 400;
            String message = "Connection could not be verified. Return to TMS.";
            try {
                if (!"GET".equals(exchange.getRequestMethod()) || !"/auth/callback".equals(exchange.getRequestURI().getPath())
                        || !exchange.getRemoteAddress().getAddress().isLoopbackAddress()) throw new IllegalArgumentException();
                completeCallback(attempt.id, query(exchange.getRequestURI().getRawQuery()));
                status = 200;
                message = "Authorization verified. Return to TMS and run the connection check.";
            } catch (Exception ignored) { }
            byte[] body = message.getBytes(StandardCharsets.UTF_8);
            exchange.getResponseHeaders().set("Content-Type", "text/plain; charset=utf-8");
            exchange.getResponseHeaders().set("Cache-Control", "no-store");
            exchange.getResponseHeaders().set("Referrer-Policy", "no-referrer");
            exchange.sendResponseHeaders(status, body.length);
            try (var out = exchange.getResponseBody()) { out.write(body); }
        });
        attempt.server.start();
    }

    void completeCallback(String id, Map<String, String> query) {
        ProviderHttp.bounded(() -> {
            Attempt attempt = locked(() -> {
                Attempt pending = attempts.get(id);
                if (pending == null || !"PENDING".equals(pending.status) || !pending.expires.isAfter(Instant.now())
                        || !constant(pending.state, query.get("state"))) throw failure("AI_AUTH_FAILED");
                pending.status = "PROCESSING";
                return pending;
            });
            boolean handedOff = false;
            try {
                access.verifySession(attempt.session, attempt.principal);
                if (query.containsKey("error")) throw failure("AI_AUTH_DENIED");
                String issued = query.getOrDefault("client_id", attempt.clientId);
                if (issued == null || !issued.matches("[A-Za-z0-9_-]{1,200}") || "dynamic_agent_client".equals(issued)
                        || (!"dynamic_agent_client".equals(attempt.clientId) && !attempt.clientId.equals(issued)))
                    throw failure("AI_AUTH_FAILED");
                String code = query.get("code");
                if (code == null || code.isBlank() || code.length() > 4096) throw failure("AI_AUTH_FAILED");
                // Persist issued metadata before exchange, separately from validated identity and tokens.
                locked(() -> {
                    requireProcessing(attempt);
                    if (attempt.subject == null) {
                        ObjectNode next = saved.deepCopy();
                        next.putObject("pendingRegistration").put("owner", attempt.owner).put("clientId", issued);
                        persist(next);
                    }
                    return null;
                });
                JsonNode tokens = oauth.exchange(issued, code, attempt.verifier, attempt.redirect);
                long expiresAt = clock.instant().getEpochSecond() + tokens.path("expires_in").asLong();
                JsonNode claims = oauth.validate(tokens, issued, attempt.nonce, attempt.subject);
                access.verifySession(attempt.session, attempt.principal);
                handedOff = true;
                return settle(() -> {
                    try {
                        requireProcessing(attempt);
                        access.verifySession(attempt.session, attempt.principal);
                        ObjectNode next = saved.deepCopy();
                        next.put("id", UUID.randomUUID().toString()).put("version", saved.path("version").asLong() + 1)
                                .put("clientId", issued).put("subject", claims.path("sub").asText());
                        String email = claims.path("email").asText("");
                        next.put("accountLabel", email.contains("@") ? email.substring(0, 1) + "***" + email.substring(email.indexOf('@')) : "ChatGPT account");
                        updateTokens(next, tokens, false, expiresAt);
                        next.remove(List.of("verifiedModel", "verifiedAt", "failureCode", "reconnectRequired", "pendingRegistration"));
                        persist(next);
                        clearCatalog();
                        attempt.status = "AUTHORIZED";
                        return null;
                    } catch (RuntimeException e) {
                        if (!(e instanceof OpenAiResponsesClient.Failure f && "AI_CREDENTIAL_STORE_FAILED".equals(f.code()))) {
                            failAttemptLocked(attempt, e instanceof OpenAiResponsesClient.Failure f ? f.code() : "AI_AUTH_FAILED");
                        }
                        throw e;
                    }
                });
            } catch (RuntimeException e) {
                String code = e instanceof OpenAiResponsesClient.Failure f ? f.code() : "AI_AUTH_FAILED";
                if (!handedOff) finishAttempt(attempt, code);
                throw failure(code);
            } finally {
                attempt.verifier = null;
                attempt.nonce = null;
            }
        });
    }

    private void requireProcessing(Attempt attempt) {
        if (!"PROCESSING".equals(attempt.status) || !attempt.expires.isAfter(Instant.now())) throw failure("AI_AUTH_FAILED");
    }

    private void finishAttempt(Attempt attempt, String code) {
        settle(() -> {
            failAttemptLocked(attempt, code);
            return null;
        });
    }

    private void failAttemptLocked(Attempt attempt, String code) {
        if ("PROCESSING".equals(attempt.status)) {
            attempt.status = "FAILED";
            attempt.failure = code;
        }
    }

    public AttemptView attempt(String actor, String id) {
        access.requireLocal(actor);
        return locked(() -> {
            expireLocked();
            Attempt attempt = owned(actor, id);
            try { access.verifySession(attempt.session, attempt.principal); }
            catch (RuntimeException e) { stop(attempt, "CANCELLED"); }
            return new AttemptView(id, attempt.status, attempt.expires, attempt.failure);
        });
    }

    public void cancel(String actor, String id) {
        access.requireLocal(actor);
        locked(() -> { stop(owned(actor, id), "CANCELLED"); return null; });
    }

    private Attempt owned(String actor, String id) {
        Attempt attempt = attempts.get(id);
        if (attempt == null || !actor.equals(attempt.owner)) throw new BusinessException(404, "NOT_FOUND", "Connection attempt not found.");
        return attempt;
    }

    @Scheduled(fixedDelay = 10000)
    public void expire() {
        if (!stateLock.tryLock()) return;
        try { expireLocked(); } finally { stateLock.unlock(); }
    }

    private void expireLocked() {
        Instant now = Instant.now();
        for (var attempt : attempts.values()) {
            if (!attempt.expires.isAfter(now) && active(attempt.status)) stop(attempt, "EXPIRED");
            else if (!active(attempt.status) && attempt.server != null) { attempt.server.stop(0); attempt.server = null; }
            if (active(attempt.status)) {
                try { access.verifySession(attempt.session, attempt.principal); }
                catch (RuntimeException e) { stop(attempt, "CANCELLED"); }
            }
        }
        attempts.values().removeIf(a -> a.expires.plusSeconds(300).isBefore(now));
    }

    private static boolean active(String status) { return "PENDING".equals(status) || "PROCESSING".equals(status); }
    private void stop(Attempt attempt, String state) {
        attempt.status = state;
        if (attempt.server != null) { attempt.server.stop(0); attempt.server = null; }
        // In-flight callback uses immutable PKCE values; final acceptance always checks status.
    }

    public List<AiProviderGateway.Model> models(String actor, String id) {
        return ProviderHttp.bounded(5, () -> {
            access.requireLocal(actor);
            var selection = locked(() -> {
                requireId(id);
                requireConnected();
                return new AiProviderGateway.ResolvedSelection("CHATGPT", "catalog", id, saved.path("version").asLong());
            });
            String token = token(actor, selection);
            var models = client.models(token);
            return locked(() -> { requireCurrent(selection); catalog = models; catalogVersion = selection.connectionVersion(); return models; });
        });
    }

    AiProviderGateway.ResolvedSelection resolve(String actor, String model, boolean verified) {
        access.requireLocal(actor);
        return locked(() -> {
            requireConnected();
            AiProviderGateway.validateModel(model);
            long version = saved.path("version").asLong();
            if (catalogVersion != version || catalog.stream().noneMatch(m -> m.id().equals(model))) throw failure("AI_MODEL_UNAVAILABLE");
            if (verified && (!model.equals(saved.path("verifiedModel").asText()) || !saved.hasNonNull("verifiedAt"))) throw failure("AI_PROBE_REQUIRED");
            return new AiProviderGateway.ResolvedSelection("CHATGPT", model, saved.path("id").asText(), version);
        });
    }

    String token(String actor, AiProviderGateway.ResolvedSelection selection) {
        return ProviderHttp.bounded(() -> {
            access.requireLocal(actor);
            String available = locked(() -> {
                requireCurrent(selection);
                return saved.path("expiresAt").asLong() > Instant.now().plusSeconds(60).getEpochSecond() ? saved.path("accessToken").asText() : null;
            });
            if (available != null) return available;
            // No waiting behind refresh and no second use of the same rotating refresh token.
            if (!refreshLock.tryLock()) throw failure("AI_BUSY");
            try {
                ObjectNode snapshot = locked(() -> { requireCurrent(selection); return saved.deepCopy(); });
                if (snapshot.path("expiresAt").asLong() > Instant.now().plusSeconds(60).getEpochSecond()) return snapshot.path("accessToken").asText();
                JsonNode tokens;
                try {
                    tokens = oauth.refresh(snapshot.path("clientId").asText(), snapshot.path("refreshToken").asText());
                } catch (OpenAiResponsesClient.Failure e) {
                    boolean terminal = "AI_OAUTH_INVALID_GRANT".equals(e.code()) || "AI_AUTH_FAILED".equals(e.code());
                    recordRefreshFailure(selection, e.code(), terminal);
                    throw failure(terminal ? "AI_RECONNECT_REQUIRED" : e.code());
                }
                // The successful response may have consumed a rotating refresh token already.
                // Any subsequent validation failure must durably close admission to that token.
                long expiresAt = clock.instant().getEpochSecond() + tokens.path("expires_in").asLong();
                try {
                    if (tokens.hasNonNull("id_token")) oauth.validate(tokens, snapshot.path("clientId").asText(), null, snapshot.path("subject").asText());
                    updateTokens(snapshot.deepCopy(), tokens, true, expiresAt);
                } catch (RuntimeException e) {
                    recordRefreshFailure(selection, "AI_RECONNECT_REQUIRED", true);
                    throw failure("AI_RECONNECT_REQUIRED");
                }
                return settle(() -> {
                        requireCurrent(selection); // Disconnect/reconnect may have happened during network I/O.
                        ObjectNode next = saved.deepCopy();
                        updateTokens(next, tokens, true, expiresAt);
                        next.remove("failureCode");
                        persist(next);
                        requireConnected();
                        return saved.path("accessToken").asText();
                });
            } finally { refreshLock.unlock(); }
        });
    }

    private void recordRefreshFailure(AiProviderGateway.ResolvedSelection selection, String code, boolean terminal) {
        settle(() -> {
            if (!sameConnection(selection)) return null;
            ObjectNode next = saved.deepCopy();
            if (terminal) {
                next.remove(List.of("accessToken", "refreshToken", "idToken", "verifiedModel", "verifiedAt", "scopes"));
                next.put("reconnectRequired", true).put("version", saved.path("version").asLong() + 1);
                clearCatalog();
            }
            next.put("failureCode", terminal ? "AI_RECONNECT_REQUIRED" : code);
            persist(next);
            return null;
        });
    }

    private void updateTokens(ObjectNode target, JsonNode tokens, boolean refreshing, long expiresAt) {
        if (!"Bearer".equalsIgnoreCase(tokens.path("token_type").asText()) || !secret(tokens.path("access_token").asText())
                || !tokens.path("expires_in").isIntegralNumber() || tokens.path("expires_in").asLong() < 1
                || tokens.path("expires_in").asLong() > 604800 || (!refreshing && !secret(tokens.path("refresh_token").asText()))) throw failure("AI_AUTH_FAILED");
        target.put("accessToken", tokens.path("access_token").asText()).put("expiresAt", expiresAt);
        if (tokens.hasNonNull("refresh_token")) {
            if (!secret(tokens.path("refresh_token").asText())) throw failure("AI_AUTH_FAILED");
            target.put("refreshToken", tokens.path("refresh_token").asText());
        }
        if (tokens.hasNonNull("id_token")) target.put("idToken", tokens.path("id_token").asText());
        if (tokens.has("scope")) target.put("scopes", tokens.path("scope").asText());
        else if (!refreshing) target.put("scopes", "");
    }

    private boolean permission() { return Arrays.asList(saved.path("scopes").asText("").split(" ")).containsAll(List.of("chatgpt.tokens.use.direct", "resource.invoke")); }
    private void requireConnected() {
        if (saved.path("reconnectRequired").asBoolean()) throw failure("AI_RECONNECT_REQUIRED");
        if (!saved.hasNonNull("accessToken")) throw failure("AI_CONNECT_REQUIRED");
        if (!permission()) throw failure("AI_PERMISSION_DENIED");
    }
    private void requireId(String id) {
        if (id == null || !id.equals(saved.path("id").asText())) throw new BusinessException(404, "NOT_FOUND", "Connection not found.");
    }
    private boolean sameConnection(AiProviderGateway.ResolvedSelection selection) {
        return Objects.equals(selection.connectionId(), saved.path("id").asText()) && selection.connectionVersion() == saved.path("version").asLong();
    }
    private void requireCurrent(AiProviderGateway.ResolvedSelection selection) {
        requireConnected();
        if (!sameConnection(selection)) throw failure("AI_CONNECTION_CHANGED");
    }
    public void assertCurrent(String actor, AiProviderGateway.ResolvedSelection selection) {
        access.requireLocal(actor);
        locked(() -> { requireCurrent(selection); return null; });
    }
    public <T> T withCurrent(String actor, AiProviderGateway.ResolvedSelection selection, Supplier<T> save) {
        access.requireLocal(actor);
        return locked(() -> { requireCurrent(selection); return save.get(); });
    }

    public Probe probe(String actor, String id, String model, String key) {
        return ProviderHttp.bounded(() -> runProbe(actor, id, model, key));
    }
    private Probe runProbe(String actor, String id, String model, String key) {
        HttpSession session = access.requireLocal(actor);
        SessionPrincipal principal = access.current(actor);
        if (key == null || !key.matches("[A-Za-z0-9_-]{8,64}")) throw new BusinessException(422, "AI_INVALID_INPUT", "Invalid request key.");
        Object reservation = locked(() -> {
            requireId(id);
            var next = saved.deepCopy();
            var probes = next.withArray("probes");
            for (var prior : probes) {
                if (key.equals(prior.path("requestKey").asText())) {
                    if (!model.equals(prior.path("model").asText()) || !id.equals(prior.path("connectionId").asText())) throw conflict("AI_REQUEST_CONFLICT");
                    return probeView(prior);
                }
            }
            var selection = resolve(actor, model, false);
            String today = LocalDate.now(ZoneOffset.UTC).toString();
            long count = 0;
            for (var prior : probes) if (today.equals(prior.path("date").asText())) count++;
            if (count >= 5) throw new BusinessException(429, "AI_PROBE_LIMIT", "Daily connection check limit reached.");
            for (int i = probes.size() - 1; i >= 0; i--)
                if (probes.get(i).path("date").asText().compareTo(LocalDate.now(ZoneOffset.UTC).minusDays(7).toString()) < 0) probes.remove(i);
            probes.addObject().put("requestKey", key).put("model", model).put("connectionId", id)
                    .put("version", selection.connectionVersion()).put("date", today).put("state", "GENERATING");
            if (model.equals(next.path("verifiedModel").asText())) next.remove(List.of("verifiedModel", "verifiedAt"));
            persist(next);
            return selection;
        });
        if (reservation instanceof Probe prior) return prior;
        var selection = (AiProviderGateway.ResolvedSelection) reservation;
        String code = null;
        try {
            ProviderHttp.inference(actor, () -> {
                String token = token(actor, selection);
                var sources = List.of(new AiDraftService.Source("probe:1", "Connection check", "", 1L));
                var output = client.generate(token, model,
                        "Return a short connection-check draft. Use only the supplied synthetic source. Do not invent facts.",
                        json.createObjectNode().put("source", "probe:1").put("fact", "This is a connection check."),
                        "tms_draft", AiDraftContent.schema(sources, json));
                AiDraftContent.validateAndWrap(output.value(), sources, json);
                return output;
            });
        } catch (RuntimeException e) {
            code = e instanceof OpenAiResponsesClient.Failure f ? f.code() : "AI_CONNECTION_CHANGED";
        }
        return finishProbe(session, principal, selection, key, model, code);
    }

    private Probe finishProbe(HttpSession session, SessionPrincipal principal,
            AiProviderGateway.ResolvedSelection selection, String key, String model, String outcomeCode) {
        return settle(() -> {
            String code = outcomeCode;
            try { access.verifySession(session, principal); requireCurrent(selection); }
            catch (RuntimeException e) { if (code == null) code = "AI_CONNECTION_CHANGED"; }
            ObjectNode next = saved.deepCopy();
            for (var node : next.withArray("probes")) {
                if (key.equals(node.path("requestKey").asText())) {
                    var probe = (ObjectNode) node;
                    probe.put("state", code == null ? "READY" : "FAILED").put("completedAt", Instant.now().toString());
                    if (code != null) probe.put("failureCode", code);
                    else next.put("verifiedModel", model).put("verifiedAt", Instant.now().toString());
                    persist(next);
                    return probeView(probe);
                }
            }
            throw conflict("AI_CONNECTION_CHANGED");
        });
    }
    private Probe probeView(JsonNode node) {
        return new Probe(node.path("requestKey").asText(), node.path("model").asText(), node.path("state").asText(),
                node.path("failureCode").asText(null), node.hasNonNull("completedAt") ? Instant.parse(node.path("completedAt").asText()) : null);
    }

    public Disconnect disconnect(String actor, String id, long version) {
        return ProviderHttp.bounded(() -> {
            access.requireLocal(actor);
            String[] credentials = locked(() -> {
                requireId(id);
                if (version != saved.path("version").asLong()) throw conflict("AI_CONNECTION_CHANGED");
                String[] tokens = { saved.path("clientId").asText(), saved.path("refreshToken").asText() };
                ObjectNode next = saved.deepCopy();
                next.remove(List.of("accessToken", "refreshToken", "idToken", "verifiedModel", "verifiedAt", "failureCode", "scopes", "reconnectRequired"));
                next.put("version", version + 1);
                persist(next);
                for (var attempt : attempts.values()) stop(attempt, "CANCELLED");
                clearCatalog();
                return tokens;
            });
            boolean revoked = !credentials[1].isBlank() && oauth.revoke(credentials[0], credentials[1]);
            return new Disconnect(true, revoked, revoked ? "Disconnected." :
                    "Disconnected locally. Remote revocation was not confirmed; disconnect the app in ChatGPT Settings.");
        });
    }

    private void persist(ObjectNode next) { vault.write(next); saved = next; }
    private void clearCatalog() { catalog = List.of(); catalogVersion = -1; }
    static Map<String, String> query(String query) {
        if (query == null || query.length() > 8192) throw new IllegalArgumentException();
        var values = new HashMap<String, String>();
        for (String pair : query.split("&")) {
            String[] kv = pair.split("=", 2);
            String key = URLDecoder.decode(kv[0], StandardCharsets.UTF_8);
            String value = kv.length == 2 ? URLDecoder.decode(kv[1], StandardCharsets.UTF_8) : "";
            if (values.putIfAbsent(key, value) != null) throw new IllegalArgumentException();
        }
        return values;
    }
    private static boolean secret(String value) { return value != null && !value.isBlank() && value.length() <= 16384 && value.chars().noneMatch(Character::isWhitespace); }
    private static String random() {
        byte[] bytes = new byte[32];
        new SecureRandom().nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }
    static String challenge(String verifier) {
        try { return Base64.getUrlEncoder().withoutPadding().encodeToString(MessageDigest.getInstance("SHA-256").digest(verifier.getBytes(StandardCharsets.US_ASCII))); }
        catch (Exception e) { throw new IllegalStateException(); }
    }
    private static boolean constant(String left, String right) {
        return left != null && right != null && MessageDigest.isEqual(left.getBytes(StandardCharsets.UTF_8), right.getBytes(StandardCharsets.UTF_8));
    }
    private static OpenAiResponsesClient.Failure failure(String code) { return new OpenAiResponsesClient.Failure(code); }
    private static BusinessException conflict(String code) { return new BusinessException(409, code, "AI connection or request has changed."); }
    @PreDestroy public void close() {
        settlements.shutdown();
        if (!stateLock.tryLock()) return;
        try { for (var attempt : attempts.values()) stop(attempt, "CANCELLED"); }
        finally { stateLock.unlock(); }
    }
}
