package vn.syp.tms.ai;

import com.fasterxml.jackson.databind.JsonNode;
import java.util.*;
import java.util.function.Supplier;
import org.springframework.stereotype.Service;

/** Common, server-resolved provider boundary. Call after TMS role/source authorization. */
@Service
public class AiProviderGateway {
    public record Selection(String provider,String model) {}
    public record ResolvedSelection(String provider,String model,String connectionId,long connectionVersion) {}
    public record Model(String id,String label) {}
    public record Provider(String code,String label,boolean enabled,boolean available,String reason,List<Model> models,ChatGptConnectionService.Connection connection) {}
    public record Metadata(List<Provider> providers,String defaultProvider,int timeoutSeconds) {}
    private final OpenAiConfiguration config;private final LocalAiConfiguration local;private final LocalAiAccess access;
    private final OpenAiResponsesClient api;private final OllamaClient ollama;private final ChatGptConnectionService connections;private final ChatGptPlanClient chatgpt;
    public AiProviderGateway(OpenAiConfiguration config,LocalAiConfiguration local,LocalAiAccess access,OpenAiResponsesClient api,
            OllamaClient ollama,ChatGptConnectionService connections,ChatGptPlanClient chatgpt) {
        this.config=config;this.local=local;this.access=access;this.api=api;this.ollama=ollama;this.connections=connections;this.chatgpt=chatgpt;
    }
    public Selection normalize(Selection requested) {
        String provider=requested==null||requested.provider()==null?"OPENAI_API":requested.provider();
        if(!List.of("OPENAI_API","CHATGPT","OLLAMA").contains(provider))throw new OpenAiResponsesClient.Failure("AI_INVALID_PROVIDER");
        String model=requested==null?null:requested.model();
        if("OPENAI_API".equals(provider)&&model==null)model=config.model();
        validateModel(model);return new Selection(provider,model);
    }
    public ResolvedSelection resolve(String actor,Selection requested) {
        access.current(actor);var selection=normalize(requested);
        return switch(selection.provider()) {
            case "OPENAI_API" -> {if(!config.enabled()||!config.configured())throw new OpenAiResponsesClient.Failure("AI_DISABLED");if(!config.model().equals(selection.model()))throw new OpenAiResponsesClient.Failure("AI_MODEL_UNAVAILABLE");yield new ResolvedSelection("OPENAI_API",selection.model(),null,0);}
            case "CHATGPT" -> connections.resolve(actor,selection.model(),true);
            case "OLLAMA" -> {var models=ProviderHttp.bounded(5,ollama::models);if(models.stream().noneMatch(m->m.id().equals(selection.model())))throw new OpenAiResponsesClient.Failure("AI_MODEL_UNAVAILABLE");yield new ResolvedSelection("OLLAMA",selection.model(),null,0);}
            default -> throw new OpenAiResponsesClient.Failure("AI_INVALID_PROVIDER");
        };
    }
    public OpenAiResponsesClient.Output generate(String actor,ResolvedSelection selection,String instructions,JsonNode data,String schemaName,JsonNode schema) {
        return generate(actor,selection,instructions,data,schemaName,schema,false);
    }
    public OpenAiResponsesClient.Output generateText(String actor,ResolvedSelection selection,String instructions,JsonNode data) {
        return generate(actor,selection,instructions,data,null,null,true);
    }
    private OpenAiResponsesClient.Output generate(String actor,ResolvedSelection selection,String instructions,JsonNode data,String schemaName,JsonNode schema,boolean textOutput) {
        access.current(actor);validateModel(selection.model());
        if(instructions==null||instructions.isBlank()||instructions.length()>12000||data==null||!data.isObject()
                ||!textOutput&&(schema==null||!schema.isObject()||schemaName==null||!schemaName.matches("[A-Za-z0-9_-]{1,64}")))throw new OpenAiResponsesClient.Failure("AI_INVALID_INPUT");
        return ProviderHttp.inference(actor,()->switch(selection.provider()) {
            case "OPENAI_API" -> {if(!config.model().equals(selection.model()))throw new OpenAiResponsesClient.Failure("AI_MODEL_UNAVAILABLE");yield textOutput?api.generateText(instructions,data):api.generate(instructions,data,schemaName,schema);}
            case "OLLAMA" -> textOutput?ollama.generateText(selection.model(),instructions,data):ollama.generate(selection.model(),instructions,data,schema);
            case "CHATGPT" -> textOutput?chatgpt.generateText(connections.token(actor,selection),selection.model(),instructions,data):chatgpt.generate(connections.token(actor,selection),selection.model(),instructions,data,schemaName,schema);
            default -> throw new OpenAiResponsesClient.Failure("AI_INVALID_PROVIDER");
        });
    }
    public void assertCurrent(String actor,ResolvedSelection selection){access.current(actor);if("CHATGPT".equals(selection.provider()))connections.assertCurrent(actor,selection);}
    public LocalAiAccess.SessionIdentity captureSession(String actor){return access.captureSession(actor);}
    public void verifySession(LocalAiAccess.SessionIdentity session){access.verifySession(session);}
    /** Holds the connection monitor across the short database transaction, closing reconnect/save race. */
    public <T> T withCurrent(String actor,ResolvedSelection selection,Supplier<T> save) {
        access.current(actor);return "CHATGPT".equals(selection.provider())?connections.withCurrent(actor,selection,save):save.get();
    }
    public boolean enabled(String actor){return config.enabled()&&config.configured()||local.ollamaEnabled||local.chatgptEnabled&&local.owner.equals(actor);}
    public Metadata metadata(String actor) {
        access.current(actor);boolean apiReady=config.enabled()&&config.configured();ChatGptConnectionService.Connection connection=null;String reason="AI_LOCAL_ONLY";
        try {
            connection = connections.connection(actor);
            reason = "VERIFIED".equals(connection.state()) ? connection.failureCode() :
                    "MISSING_PERMISSION".equals(connection.state()) ? "AI_PERMISSION_DENIED" :
                    "RECONNECT_REQUIRED".equals(connection.state()) ? "AI_RECONNECT_REQUIRED" : "AI_CONNECT_REQUIRED";
        } catch (OpenAiResponsesClient.Failure e) {
            reason = e.code();
        } catch (vn.syp.tms.shared.web.BusinessException ignored) { }
        return new Metadata(List.of(new Provider("OPENAI_API","API của hệ thống",config.enabled(),apiReady,apiReady?null:"AI_NOT_CONFIGURED",List.of(new Model(config.model(),config.model())),null),
                new Provider("CHATGPT","ChatGPT cá nhân",local.chatgptEnabled,connection!=null&&"VERIFIED".equals(connection.state()),reason,List.of(),connection),
                new Provider("OLLAMA","Ollama local",local.ollamaEnabled,local.ollamaEnabled,local.ollamaEnabled?null:"AI_DISABLED",List.of(),null)),"OPENAI_API",30);
    }
    public List<Model> models(String actor,String provider,String connectionId) {
        return ProviderHttp.bounded(5, () -> {
            access.current(actor);
            return switch (provider) {
                case "OPENAI_API" -> List.of(new Model(config.model(), config.model()));
                case "OLLAMA" -> ollama.models();
                case "CHATGPT" -> connections.models(actor, connectionId);
                default -> throw new OpenAiResponsesClient.Failure("AI_INVALID_PROVIDER");
            };
        });
    }
    static void validateModel(String model){if(model==null||!model.matches("[A-Za-z0-9][A-Za-z0-9._:/-]{0,99}")||model.contains("..")||model.contains("//"))throw new OpenAiResponsesClient.Failure("AI_INVALID_MODEL");}
}
