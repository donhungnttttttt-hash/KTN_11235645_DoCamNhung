package vn.syp.tms.admin;

import jakarta.validation.constraints.*;
import java.time.LocalDate;

public final class DeviceInventoryDtos {
 private DeviceInventoryDtos() {}
 public record Asset(@NotBlank @Size(max=64) String assetCode,
   @NotBlank @Pattern(regexp="IPAD|IPHONE|ANDROID|OTHER") String type,
   @NotBlank @Size(max=100) String model,@Size(max=100) String serial,
   @Size(max=50) String osName,@Size(max=50) String osVersion,
   @NotBlank @Pattern(regexp="AVAILABLE|MAINTENANCE|RETIRED") String conditionCode,
   @Size(max=1000) String notes,Long expectedVersion) {}
 public record Assign(@Positive long assetId,@Positive long projectId,@NotBlank String recipientUserId,
   LocalDate expectedReturnOn,@Size(max=1000) String handoverNote,@NotNull @PositiveOrZero Long expectedVersion) {}
 public record Return(@NotNull @PositiveOrZero Long expectedVersion,
   @NotBlank @Pattern(regexp="AVAILABLE|MAINTENANCE|RETIRED") String conditionCode,@Size(max=1000) String returnNote) {}
 public record Initial(@Positive long assetId,@NotBlank String recipientUserId,
   LocalDate expectedReturnOn,@Size(max=1000) String handoverNote,@NotNull @PositiveOrZero Long expectedVersion) {}
}
