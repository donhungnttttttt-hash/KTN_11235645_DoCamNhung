import java.nio.file.*;
import java.util.*;
import org.yaml.snakeyaml.Yaml;
class CheckLifecycleContract {
 public static void main(String[] args) throws Exception {
  Map<?,?> root=new Yaml().load(Files.readString(Path.of("docs/api/admin-management.openapi.yaml")));
  Map<?,?> paths=(Map<?,?>)root.get("paths");
  for(String part:List.of("archive-readiness","archive","reopen","lifecycle-decisions"))
   if(!paths.containsKey("/admin/projects/{id}/"+part))throw new IllegalStateException("Missing operation "+part);
  refs(root,root);
  Map<?,?> schemas=(Map<?,?>)((Map<?,?>)root.get("components")).get("schemas");
  Map<?,?> properties=(Map<?,?>)((Map<?,?>)schemas.get("ProjectLifecycleReadiness")).get("properties");
  Map<?,?> decision=(Map<?,?>)properties.get("latestDecision");
  List<?> alternatives=(List<?>)decision.get("anyOf");
  if(alternatives==null || alternatives.stream().noneMatch(x->x instanceof Map<?,?> branch && Boolean.TRUE.equals(branch.get("nullable")) && branch.get("enum") instanceof List<?> values && values.size()==1 && values.contains(null)))
   throw new IllegalStateException("Missing explicit null branch");
  if(!properties.containsKey("warnings"))throw new IllegalStateException("Missing publication warning schema");
  System.out.println("YAML parsed; 4 lifecycle operations, all internal references and nullable decision branch verified. Not a full OpenAPI validator.");
 }
 static void refs(Object value,Map<?,?> root) {
  if(value instanceof Map<?,?> map){
   if(map.get("$ref") instanceof String reference && reference.startsWith("#/")){
    Object target=root;
    for(String part:reference.substring(2).split("/"))target=target instanceof Map<?,?> m?m.get(part.replace("~1","/").replace("~0","~")):null;
    if(target==null)throw new IllegalStateException("Unresolved reference "+reference);
   }
   map.values().forEach(child->refs(child,root));
  }else if(value instanceof List<?> list)list.forEach(child->refs(child,root));
 }
}
