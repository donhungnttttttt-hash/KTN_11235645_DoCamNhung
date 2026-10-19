package vn.syp.tms.shared.search;

import static org.junit.jupiter.api.Assertions.*;
import java.util.*;
import org.junit.jupiter.api.Test;

class MultiWordSearchTest {
 @Test void tokensFoldVietnameseUnicodeWhitespaceAndStrokeLetters(){
  assertEquals(List.of("do","cam","nhung"),MultiWordSearch.tokens("  ĐỖ  Ca\u0302\u0309m\tNHUNG do  "));
  assertEquals(List.of(),MultiWordSearch.tokens(null));
 }
 @Test void allTokensAreLiteralBoundValuesAndMayMatchDifferentFields(){
  var clause=MultiWordSearch.sql("NHUNG cam_ 10% 'quoted'","u.username","u.display_name");
  assertEquals(List.of("%nhung%","%nhung%","%cam!_%","%cam!_%","%10!%%","%10!%%","%'quoted'%","%'quoted'%"),clause.args());
  assertFalse(clause.sql().contains("'quoted'"));
  assertEquals(4,clause.sql().split(" AND ",-1).length-1);
  assertTrue(clause.sql().contains("utf8mb4_0900_ai_ci"));
  assertTrue(clause.sql().contains("ESCAPE '!'"));
  assertEquals("",MultiWordSearch.sql(" ","p.name").sql());
 }
}
