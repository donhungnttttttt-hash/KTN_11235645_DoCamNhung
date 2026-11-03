package vn.syp.tms.identity;

import static org.assertj.core.api.Assertions.*;
import java.util.*;
import org.junit.jupiter.api.Test;
import vn.syp.tms.support.UnifiedAccessFixtures;

class UnifiedIdentityNativeTest extends UnifiedAccessFixtures {
    private Map<String,Object> createInput(){return new LinkedHashMap<>(Map.of("username","new."+UUID.randomUUID().toString().substring(0,8),"displayName","Tên độc lập","password",PASSWORD));}
    @Test void defaultCreatesUserAndExclusiveFlagsSelectPmOrGuest()throws Exception{
        var caller=loggedIn(admin);
        for(String type:List.of("USER","PM","GUEST")){
            var input=createInput();input.put("isProjectAdmin",type.equals("PM"));input.put("isGuest",type.equals("GUEST"));
            var response=caller.write("POST","/users",input);
            assertThat(response.statusCode()).isEqualTo(201);assertThat(body(response).path("role").asText()).isEqualTo(type);
            assertThat(body(response).path("displayName").asText()).isEqualTo("Tên độc lập");
        }
    }
    @Test void bothFlagsAndLegacyRoleRejectedWithoutInsert()throws Exception{
        var caller=loggedIn(admin);long before=users.count();var both=createInput();both.put("isProjectAdmin",true);both.put("isGuest",true);
        assertThat(caller.write("POST","/users",both).statusCode()).isEqualTo(422);
        var legacy=createInput();legacy.put("role","ADMIN");assertThat(caller.write("POST","/users",legacy).statusCode()).isEqualTo(422);
        assertThat(users.count()).isEqualTo(before);
    }
    @Test void delegatedPmCreatesOnlyUser()throws Exception{
        var pm=account("PM");pm.setCanCreateUsers(true);users.saveAndFlush(pm);var caller=loggedIn(pm);
        assertThat(caller.write("POST","/users",createInput()).statusCode()).isEqualTo(201);
        for(String flag:List.of("isProjectAdmin","isGuest")){var input=createInput();input.put(flag,true);assertThat(caller.write("POST","/users",input).statusCode()).isEqualTo(403);}
        for(String type:List.of("USER","GUEST","PM"))assertThat(loggedIn(account(type)).write("POST","/users",createInput()).statusCode()).isEqualTo(403);
    }
    @Test void registeredAdminOnlyGetsGlobalAuthorities()throws Exception{
        var outsider=account("ADMIN");assertThat(new Client().login(outsider.getUsername(),PASSWORD).statusCode()).isEqualTo(401);
        var registered=loggedIn(admin);jdbc.update("DELETE FROM system_admin_registry WHERE user_id=?",admin.getId());
        assertThat(registered.get("/users").statusCode()).isEqualTo(401);
    }
    @Test void renamedIdKeepsUuidAndOldSessionExpires()throws Exception{
        var target=account("USER");var old=loggedIn(target);String renamed="renamed."+UUID.randomUUID().toString().substring(0,8);
        var response=loggedIn(admin).write("PATCH","/users/"+target.getId(),Map.of("username",renamed,"displayName","Tên mới","expectedVersion",0));
        assertThat(response.statusCode()).isEqualTo(200);assertThat(body(response).path("id").asText()).isEqualTo(target.getId());
        assertThat(old.get("/me").statusCode()).isEqualTo(401);assertThat(new Client().login(renamed,PASSWORD).statusCode()).isEqualTo(200);
    }
}
