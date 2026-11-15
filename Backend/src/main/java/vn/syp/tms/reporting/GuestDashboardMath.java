package vn.syp.tms.reporting;

import java.time.*;

/** User-selected simulation assumptions, not accounting or an industry benchmark. */
public final class GuestDashboardMath {
 private GuestDashboardMath() {}
 public static boolean workingDay(LocalDate date) {return date.getDayOfWeek()!=DayOfWeek.SATURDAY&&date.getDayOfWeek()!=DayOfWeek.SUNDAY;}
 public static long dailyCost(long users,long managers,boolean working) {return working?(users+5*managers)*500:0;}
 public static long dailyTarget(long users,boolean working) {return working?users*50:0;}
 public static String progressRisk(long total,long tested,long planned,long baselineTotal,long users){
  return users==0||total!=baselineTotal?"INSUFFICIENT_DATA":progressRisk(total,tested,planned);
 }
 public static LocalDate previousWorkingDay(LocalDate today){LocalDate day=today.minusDays(1);while(!workingDay(day))day=day.minusDays(1);return day;}
 public static String progressRisk(long total,long tested,long planned) {
  if(total==0||planned==0)return "INSUFFICIENT_DATA";
  if(tested>=planned)return "ON_TRACK";
  return tested*100<planned*80?"HIGH":"WATCH";
 }
}
