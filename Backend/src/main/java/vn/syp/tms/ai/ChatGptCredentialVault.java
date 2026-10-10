package vn.syp.tms.ai;

import com.fasterxml.jackson.databind.*;
import jakarta.annotation.PreDestroy;
import java.nio.ByteBuffer;
import java.nio.channels.*;
import java.nio.file.*;
import java.nio.file.attribute.*;
import java.security.*;
import java.util.*;
import javax.crypto.*;
import javax.crypto.spec.*;
import org.springframework.stereotype.Component;

/** AES-GCM at rest with external key; owner-only files and process lock. No secrets in database. */
@Component
public class ChatGptCredentialVault {
    private final LocalAiConfiguration config;private final ObjectMapper json;
    private SecretKey key;private FileChannel lockChannel;private FileLock lock;
    public ChatGptCredentialVault(LocalAiConfiguration config,ObjectMapper json) {
        this.config=config;this.json=json;
        if(config.chatgptEnabled) {
            try {
                byte[] raw=Base64.getDecoder().decode(config.vaultKey);if(raw.length!=32)throw new IllegalArgumentException();key=new SecretKeySpec(raw,"AES");Arrays.fill(raw,(byte)0);
                Path dir=config.vaultPath.toAbsolutePath().normalize();
                if(dir.startsWith(Path.of("").toAbsolutePath().normalize())||Files.isSymbolicLink(dir))throw new IllegalArgumentException();
                Files.createDirectories(dir);secure(dir);
                Path guard=dir.resolve("runtime.lock");if(!Files.exists(guard))Files.createFile(guard);secure(guard);
                lockChannel=FileChannel.open(guard,StandardOpenOption.WRITE);lock=lockChannel.tryLock();if(lock==null)throw new IllegalArgumentException();
            }catch(Exception e){close();throw new IllegalArgumentException("ChatGPT protected vault unavailable; check external key, owner-only path and single-process ownership.");}
        }
    }
    synchronized JsonNode read() {
        try {
            Path file=file();if(!Files.exists(file))return null;check(file);
            if(Files.size(file)>65536)throw new IllegalArgumentException();
            byte[] encoded=Files.readAllBytes(file);if(encoded.length<29)throw new IllegalArgumentException();
            Cipher cipher=Cipher.getInstance("AES/GCM/NoPadding");cipher.init(Cipher.DECRYPT_MODE,key,new GCMParameterSpec(128,encoded,0,12));
            cipher.updateAAD(config.owner.getBytes(java.nio.charset.StandardCharsets.UTF_8));
            return json.readTree(cipher.doFinal(encoded,12,encoded.length-12));
        }catch(Exception e){throw new OpenAiResponsesClient.Failure("AI_CREDENTIAL_STORE_FAILED");}
    }
    synchronized void write(JsonNode value) {
        Path temporary=null;
        try {
            byte[] nonce=new byte[12];new SecureRandom().nextBytes(nonce);
            Cipher cipher=Cipher.getInstance("AES/GCM/NoPadding");cipher.init(Cipher.ENCRYPT_MODE,key,new GCMParameterSpec(128,nonce));
            cipher.updateAAD(config.owner.getBytes(java.nio.charset.StandardCharsets.UTF_8));
            byte[] encrypted=cipher.doFinal(json.writeValueAsBytes(value));
            temporary=Files.createTempFile(config.vaultPath,"credential-",".tmp");secure(temporary);
            try(var channel=FileChannel.open(temporary,StandardOpenOption.WRITE)){channel.write(ByteBuffer.wrap(nonce));channel.write(ByteBuffer.wrap(encrypted));channel.force(true);}
            Files.move(temporary,file(),StandardCopyOption.ATOMIC_MOVE,StandardCopyOption.REPLACE_EXISTING);check(file());
        }catch(Exception e){throw new OpenAiResponsesClient.Failure("AI_CREDENTIAL_STORE_FAILED");}
        finally{if(temporary!=null)try{Files.deleteIfExists(temporary);}catch(Exception ignored){}}
    }
    private Path file(){if(key==null)throw new OpenAiResponsesClient.Failure("AI_DISABLED");return config.vaultPath.resolve("chatgpt.enc");}
    static void secure(Path path) throws Exception {
        if(Files.isSymbolicLink(path))throw new IllegalArgumentException();
        var acl=Files.getFileAttributeView(path,AclFileAttributeView.class,LinkOption.NOFOLLOW_LINKS);
        if(acl!=null){var owner=Files.getOwner(path);acl.setAcl(List.of(AclEntry.newBuilder().setType(AclEntryType.ALLOW).setPrincipal(owner).setPermissions(EnumSet.allOf(AclEntryPermission.class)).build()));}
        else Files.setPosixFilePermissions(path,Files.isDirectory(path)?PosixFilePermissions.fromString("rwx------"):PosixFilePermissions.fromString("rw-------"));
        check(path);
    }
    static void check(Path path) throws Exception {
        if(Files.isSymbolicLink(path))throw new IllegalArgumentException();
        var acl=Files.getFileAttributeView(path,AclFileAttributeView.class,LinkOption.NOFOLLOW_LINKS);
        if(acl!=null){var owner=Files.getOwner(path);if(acl.getAcl().stream().anyMatch(e->e.type()==AclEntryType.ALLOW&&!e.principal().equals(owner)))throw new IllegalArgumentException();}
        else if(Files.getPosixFilePermissions(path).stream().anyMatch(p->p.name().startsWith("GROUP_")||p.name().startsWith("OTHERS_")))throw new IllegalArgumentException();
    }
    @PreDestroy public void close(){try{if(lock!=null)lock.release();if(lockChannel!=null)lockChannel.close();}catch(Exception ignored){}}
}
