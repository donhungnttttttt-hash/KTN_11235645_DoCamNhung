package vn.syp.tms.identity;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.HexFormat;
import java.util.Objects;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

@Service
public class LoginThrottle {
    private final JdbcTemplate jdbc;
    public LoginThrottle(JdbcTemplate jdbc) { this.jdbc = jdbc; }
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public boolean allow(String username, String address) {
        var now = Timestamp.from(Instant.now());
        var expiry = Timestamp.from(Instant.now().plusSeconds(60));
        jdbc.update("DELETE FROM identity_login_buckets WHERE expires_at < ? LIMIT 100", now);
        int userAttempts = consume("user|" + username, now, expiry);
        int ipAttempts = consume("ip|" + address, now, expiry);
        return userAttempts <= 5 && ipAttempts <= 30;
    }
    private int consume(String value, Timestamp now, Timestamp expiry) {
        String key;
        try { key = HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(value.getBytes(StandardCharsets.UTF_8))); }
        catch (java.security.NoSuchAlgorithmException impossible) { throw new IllegalStateException(impossible); }
        jdbc.update("INSERT INTO identity_login_buckets (bucket_key, attempts, expires_at) VALUES (?, 1, ?) "
                + "ON DUPLICATE KEY UPDATE attempts = IF(expires_at <= ?, 1, LEAST(attempts + 1, 1000000)), "
                + "expires_at = IF(expires_at <= ?, ?, expires_at)", key, expiry, now, now, expiry);
        return Objects.requireNonNull(jdbc.queryForObject("SELECT attempts FROM identity_login_buckets WHERE bucket_key = ?", Integer.class, key));
    }
}
