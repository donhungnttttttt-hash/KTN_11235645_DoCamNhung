package vn.syp.tms.project;

import static org.assertj.core.api.Assertions.*;
import java.util.*;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import vn.syp.tms.shared.web.BusinessException;
import vn.syp.tms.support.UnifiedAccessFixtures;

class UnifiedMembershipNativeTest extends UnifiedAccessFixtures {
    @Autowired MembershipRepository memberships;
    @Autowired vn.syp.tms.admin.DeviceInventoryService devices;
    private long project(){return projects.create(admin.getId(),new ProjectDtos.CreateProject("UA"+UUID.randomUUID().toString().substring(0,8),"Unified project","","UTC")).id();}
    @Test void adminAddsFixedTypesPmAddsOnlyUser(){
        long p=project();var pm=account("PM");projects.addOrUpdateMember(p,admin.getId(),pm.getId(),new ProjectDtos.SetMember("PM"));
        var worker=account("USER");var added=projects.addOrUpdateMember(p,pm.getId(),worker.getId(),new ProjectDtos.SetMember("USER"));
        assertThat(added.projectRole()).isEqualTo("USER");
        var guest=account("GUEST");assertThatThrownBy(()->projects.addOrUpdateMember(p,pm.getId(),guest.getId(),new ProjectDtos.SetMember("GUEST"))).isInstanceOfSatisfying(BusinessException.class,e->assertThat(e.status()).isEqualTo(403));
        assertThat(projects.addOrUpdateMember(p,admin.getId(),guest.getId(),new ProjectDtos.SetMember("GUEST")).projectRole()).isEqualTo("GUEST");
        var otherAdmin=account("ADMIN");registry.register(2,otherAdmin.getId());
        assertThat(projects.addOrUpdateMember(p,admin.getId(),otherAdmin.getId(),new ProjectDtos.SetMember("PM")).projectRole()).isEqualTo("PM");
        assertThat(users.findById(Objects.requireNonNull(otherAdmin.getId())).orElseThrow().getRole()).isEqualTo("ADMIN");
    }
    @Test void existingMembersExcludedBeforePagination()throws Exception{
        long p=project();String tag="page."+UUID.randomUUID().toString().substring(0,8);var available=new HashSet<String>();
        for(int n=0;n<7;n++){
            var user=users.saveAndFlush(new vn.syp.tms.identity.IdentityUser(tag+"."+n,"Page member",hash,"USER"));
            if(n<4)memberships.saveAndFlush(new ProjectMembership(p,user.getId(),"USER"));else available.add(user.getId());
        }
        var caller=loggedIn(admin);var actual=new HashSet<String>();
        for(int page=0;page<3;page++){
            var response=caller.get("/admin/users?keyword="+tag+"&role=USER&excludeProjectId="+p+"&size=1&page="+page);
            assertThat(response.statusCode()).isEqualTo(200);var data=body(response);assertThat(data.path("totalElements").asInt()).isEqualTo(3);
            data.path("items").forEach(item->actual.add(item.path("id").asText()));
        }
        assertThat(actual).isEqualTo(available);
    }
    @Test void guestAndInactiveAttributionDoNotGrantWorkspaceAccess(){
        long p=project();var guest=account("GUEST");memberships.saveAndFlush(new ProjectMembership(p,guest.getId(),"GUEST"));
        assertThatThrownBy(()->projects.get(p,guest.getId())).isInstanceOfSatisfying(BusinessException.class,e->assertThat(e.status()).isEqualTo(403));
        var worker=account("USER");var attribution=new ProjectMembership(p,worker.getId(),"MEMBER");
        memberships.saveAndFlush(attribution);jdbc.update("UPDATE project_memberships SET active=FALSE WHERE id=?",attribution.getId());
        assertThatThrownBy(()->projects.get(p,worker.getId())).isInstanceOf(BusinessException.class);
    }
    @Test void guestCannotReceiveDeviceEvenWithInconsistentPmMembership(){
        long p=project();var guest=account("GUEST");memberships.saveAndFlush(new ProjectMembership(p,guest.getId(),"PM"));
        var asset=devices.create(admin.getId(),new vn.syp.tms.admin.DeviceInventoryDtos.Asset("UA"+UUID.randomUUID(),"IPAD","Fixture",null,"iPadOS","18","AVAILABLE","",null));
        long assetId=((Number)asset.get("id")).longValue();
        assertThatThrownBy(()->devices.assign(admin.getId(),new vn.syp.tms.admin.DeviceInventoryDtos.Assign(assetId,p,guest.getId(),null,"",0L))).isInstanceOf(BusinessException.class);
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM device_allocations WHERE asset_id=?",Long.class,assetId)).isZero();
    }
}
