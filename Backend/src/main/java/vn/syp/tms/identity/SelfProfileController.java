package vn.syp.tms.identity;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import org.springframework.http.*;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.context.SecurityContextRepository;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import vn.syp.tms.shared.web.ApiExceptionHandler;

@RestController
@RequestMapping("/api/v1/me")
public class SelfProfileController {
 private final SelfProfileService profiles;
 private final SecurityContextRepository contexts;
 public SelfProfileController(SelfProfileService profiles,SecurityContextRepository contexts){this.profiles=profiles;this.contexts=contexts;}
 @GetMapping("/profile")
 public SelfProfileDtos.Profile profile(@AuthenticationPrincipal SessionPrincipal principal){return profiles.get(principal.id());}
 @PutMapping("/profile")
 public SelfProfileDtos.Profile update(@AuthenticationPrincipal SessionPrincipal principal,@Valid @RequestBody SelfProfileDtos.Update input,HttpServletRequest request,HttpServletResponse response){
  var saved=profiles.update(principal,input,ApiExceptionHandler.requestId(request),java.util.Objects.requireNonNull(request.getSession(false)).getId());
  if(saved.accountVersion()!=principal.version()){
   var authentication=SecurityContextHolder.getContext().getAuthentication();var context=SecurityContextHolder.createEmptyContext();
   context.setAuthentication(UsernamePasswordAuthenticationToken.authenticated(new SessionPrincipal(principal.id(),saved.accountVersion()),null,authentication.getAuthorities()));
   SecurityContextHolder.setContext(context);contexts.saveContext(context,request,response);
  }
  return saved;
 }
 @GetMapping("/avatar")
 public ResponseEntity<byte[]> avatar(@AuthenticationPrincipal SessionPrincipal principal){return ResponseEntity.ok().contentType(java.util.Objects.requireNonNull(MediaType.IMAGE_PNG)).cacheControl(CacheControl.noStore().cachePrivate()).header("X-Content-Type-Options","nosniff").body(profiles.avatar(principal.id()));}
 @PutMapping(value="/avatar",consumes=MediaType.MULTIPART_FORM_DATA_VALUE)
 public SelfProfileDtos.Profile upload(@AuthenticationPrincipal SessionPrincipal principal,@RequestParam long expectedVersion,@RequestParam long expectedAccountVersion,@RequestPart MultipartFile file,HttpServletRequest request){return profiles.setAvatar(principal,expectedVersion,expectedAccountVersion,AvatarImage.normalize(file),ApiExceptionHandler.requestId(request));}
 @DeleteMapping("/avatar")
 public SelfProfileDtos.Profile remove(@AuthenticationPrincipal SessionPrincipal principal,@RequestParam long expectedVersion,@RequestParam long expectedAccountVersion,HttpServletRequest request){return profiles.setAvatar(principal,expectedVersion,expectedAccountVersion,null,ApiExceptionHandler.requestId(request));}
}
