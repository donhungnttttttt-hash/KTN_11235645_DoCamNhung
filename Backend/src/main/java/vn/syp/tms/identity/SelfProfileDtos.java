package vn.syp.tms.identity;

import jakarta.validation.constraints.*;
import java.time.Instant;
import vn.syp.tms.shared.web.BusinessException;

public final class SelfProfileDtos {
 private SelfProfileDtos() {}
 public record Profile(String id,String username,String displayName,String role,Instant createdAt,
     String email,String phone,String jobTitle,String department,boolean hasAvatar,long version,long accountVersion) {}
 public record Update(@NotBlank @Size(max=100) String displayName,@Email @Size(max=254) String email,
     @Size(max=30) @Pattern(regexp="[+0-9() .-]*") String phone,@Size(max=100) String jobTitle,@Size(max=100) String department,
     @NotNull @PositiveOrZero Long expectedVersion,@NotNull @PositiveOrZero Long expectedAccountVersion) {
  @com.fasterxml.jackson.annotation.JsonAnySetter
  public void rejectUnknown(String name,Object value){throw new BusinessException(422,"INVALID_PROFILE_FIELD","Chỉ cập nhật thông tin cá nhân; ID và loại tài khoản không được thay đổi tại đây.");}
  @Override public String toString(){return "SelfProfileUpdate[redacted]";}
 }
}
