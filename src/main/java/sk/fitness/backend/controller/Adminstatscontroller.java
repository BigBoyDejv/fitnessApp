package sk.fitness.backend.controller;

import sk.fitness.backend.model.Membership;
import sk.fitness.backend.model.User;
import sk.fitness.backend.repository.*;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.time.*;
import java.time.format.TextStyle;
import java.util.*;

@RestController
@RequestMapping("/api/admin/stats")
public class Adminstatscontroller {

    private final MembershipController membershipController;
    private final UserRepository userRepository;
    private final ReceptionSaleRepository receptionSaleRepository;
    private final CheckInRepository checkInRepository;
    private final MembershipRepository membershipRepository;

    public Adminstatscontroller(MembershipController membershipController,
                                UserRepository userRepository,
                                ReceptionSaleRepository receptionSaleRepository,
                                CheckInRepository checkInRepository,
                                MembershipRepository membershipRepository) {
        this.membershipController = membershipController;
        this.userRepository = userRepository;
        this.receptionSaleRepository = receptionSaleRepository;
        this.checkInRepository = checkInRepository;
        this.membershipRepository = membershipRepository;
    }

    // ── Proxy na existujúce endpointy ─────────────────────────────────────────

    @GetMapping("/memberships")
    public ResponseEntity<?> membershipStats(@AuthenticationPrincipal UserDetails ud) {
        return membershipController.membershipStats(ud);
    }

    @GetMapping("/revenue")
    public ResponseEntity<?> revenueStats(@AuthenticationPrincipal UserDetails ud) {
        return membershipController.revenueStats(ud);
    }

    // ══════════════════════════════════════════════════════════════════════════
    //  NOVÉ ENDPOINTY – podrobné štatistiky pre admin dashboard
    // ══════════════════════════════════════════════════════════════════════════

    // ── 1. Top predávané produkty na recepcii ─────────────────────────────────
    @GetMapping("/reception/top-products")
    public ResponseEntity<?> topProducts(
            @RequestParam(required = false) Integer months,
            @AuthenticationPrincipal UserDetails ud) {
        if (!isAdmin(ud)) return ResponseEntity.status(403).build();

        int m = months != null ? months : 1;
        LocalDateTime from = LocalDateTime.now().minusMonths(m)
                .withHour(0).withMinute(0).withSecond(0).withNano(0);
        LocalDateTime to = LocalDateTime.now();

        List<Object[]> rows = receptionSaleRepository.topSellingProducts(from, to);
        List<Map<String, Object>> result = new ArrayList<>();
        for (Object[] row : rows) {
            Map<String, Object> item = new LinkedHashMap<>();
            item.put("productName", row[0] != null ? row[0].toString() : "—");
            item.put("totalQuantity", ((Number) row[1]).longValue());
            item.put("totalRevenueCents", ((Number) row[2]).longValue());
            item.put("totalRevenueEuros", ((Number) row[2]).longValue() / 100.0);
            result.add(item);
        }
        return ResponseEntity.ok(result);
    }

    // ── 2. Predaje podľa kategórie ────────────────────────────────────────────
    @GetMapping("/reception/by-category")
    public ResponseEntity<?> salesByCategory(
            @RequestParam(required = false) Integer months,
            @AuthenticationPrincipal UserDetails ud) {
        if (!isAdmin(ud)) return ResponseEntity.status(403).build();

        int m = months != null ? months : 1;
        LocalDateTime from = LocalDateTime.now().minusMonths(m)
                .withHour(0).withMinute(0).withSecond(0).withNano(0);
        LocalDateTime to = LocalDateTime.now();

        List<Object[]> rows = receptionSaleRepository.salesByCategory(from, to);
        List<Map<String, Object>> result = new ArrayList<>();
        for (Object[] row : rows) {
            Map<String, Object> item = new LinkedHashMap<>();
            item.put("category", row[0] != null ? row[0].toString() : "—");
            item.put("totalQuantity", ((Number) row[1]).longValue());
            item.put("totalRevenueCents", ((Number) row[2]).longValue());
            item.put("totalRevenueEuros", ((Number) row[2]).longValue() / 100.0);
            result.add(item);
        }
        return ResponseEntity.ok(result);
    }

    // ── 3. Predaje podľa spôsobu platby ───────────────────────────────────────
    @GetMapping("/reception/by-payment")
    public ResponseEntity<?> salesByPayment(
            @RequestParam(required = false) Integer months,
            @AuthenticationPrincipal UserDetails ud) {
        if (!isAdmin(ud)) return ResponseEntity.status(403).build();

        int m = months != null ? months : 1;
        LocalDateTime from = LocalDateTime.now().minusMonths(m)
                .withHour(0).withMinute(0).withSecond(0).withNano(0);
        LocalDateTime to = LocalDateTime.now();

        List<Object[]> rows = receptionSaleRepository.salesByPaymentMethod(from, to);
        List<Map<String, Object>> result = new ArrayList<>();
        for (Object[] row : rows) {
            Map<String, Object> item = new LinkedHashMap<>();
            item.put("paymentMethod", row[0] != null ? row[0].toString() : "—");
            item.put("count", ((Number) row[1]).longValue());
            item.put("totalRevenueCents", ((Number) row[2]).longValue());
            item.put("totalRevenueEuros", ((Number) row[2]).longValue() / 100.0);
            result.add(item);
        }
        return ResponseEntity.ok(result);
    }

    // ── 4. Celkový súhrn recepčných tržieb ────────────────────────────────────
    @GetMapping("/reception/summary")
    public ResponseEntity<?> receptionSummary(
            @RequestParam(required = false) Integer months,
            @AuthenticationPrincipal UserDetails ud) {
        if (!isAdmin(ud)) return ResponseEntity.status(403).build();

        int m = months != null ? months : 1;
        LocalDateTime from = LocalDateTime.now().minusMonths(m)
                .withHour(0).withMinute(0).withSecond(0).withNano(0);
        LocalDateTime to = LocalDateTime.now();

        Long revenueCents = receptionSaleRepository.totalRevenueCents(from, to);
        Long count = receptionSaleRepository.countSales(from, to);

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("totalRevenueCents", revenueCents);
        result.put("totalRevenueEuros", revenueCents / 100.0);
        result.put("totalTransactions", count);
        result.put("periodMonths", m);
        return ResponseEntity.ok(result);
    }

    // ── 5. Denné tržby recepcie (pre graf) ────────────────────────────────────
    @GetMapping("/reception/daily")
    public ResponseEntity<?> dailyRevenue(
            @RequestParam(required = false) Integer days,
            @AuthenticationPrincipal UserDetails ud) {
        if (!isAdmin(ud)) return ResponseEntity.status(403).build();

        int d = days != null ? days : 30;
        LocalDateTime from = LocalDateTime.now().minusDays(d).withHour(0).withMinute(0).withSecond(0);
        LocalDateTime to = LocalDateTime.now();

        List<Object[]> rows = receptionSaleRepository.dailyRevenue(from, to);
        List<Map<String, Object>> result = new ArrayList<>();
        for (Object[] row : rows) {
            Map<String, Object> item = new LinkedHashMap<>();
            item.put("date", row[0] != null ? row[0].toString() : "—");
            item.put("totalRevenueCents", ((Number) row[1]).longValue());
            item.put("totalRevenueEuros", ((Number) row[1]).longValue() / 100.0);
            item.put("transactionCount", ((Number) row[2]).longValue());
            result.add(item);
        }
        return ResponseEntity.ok(result);
    }

    // ── 6. Mesačné tržby recepcie ─────────────────────────────────────────────
    @GetMapping("/reception/monthly")
    public ResponseEntity<?> monthlyReceptionRevenue(
            @RequestParam(required = false) Integer months,
            @AuthenticationPrincipal UserDetails ud) {
        if (!isAdmin(ud)) return ResponseEntity.status(403).build();

        int m = months != null ? months : 12;
        LocalDateTime from = LocalDateTime.now().minusMonths(m).withDayOfMonth(1).withHour(0).withMinute(0).withSecond(0);
        LocalDateTime to = LocalDateTime.now();

        List<Object[]> rows = receptionSaleRepository.monthlyRevenue(from, to);
        List<Map<String, Object>> result = new ArrayList<>();
        Locale sk = new Locale("sk", "SK");
        for (Object[] row : rows) {
            int year = ((Number) row[0]).intValue();
            int month = ((Number) row[1]).intValue();
            Map<String, Object> item = new LinkedHashMap<>();
            item.put("year", year);
            item.put("month", month);
            item.put("label", YearMonth.of(year, month).getMonth().getDisplayName(TextStyle.SHORT, sk));
            item.put("totalRevenueCents", ((Number) row[2]).longValue());
            item.put("totalRevenueEuros", ((Number) row[2]).longValue() / 100.0);
            item.put("transactionCount", ((Number) row[3]).longValue());
            result.add(item);
        }
        return ResponseEntity.ok(result);
    }

    // ── 7. Check-in štatistiky — kedy ľudia chodia cvičiť ────────────────────
    @GetMapping("/checkins/by-hour")
    public ResponseEntity<?> checkinsByHour(
            @RequestParam(required = false) Integer days,
            @AuthenticationPrincipal UserDetails ud) {
        if (!isAdmin(ud)) return ResponseEntity.status(403).build();

        int d = days != null ? days : 30;
        LocalDateTime from = LocalDateTime.now().minusDays(d).withHour(0).withMinute(0).withSecond(0);
        LocalDateTime to = LocalDateTime.now();

        List<Object[]> rows = checkInRepository.countByHour(from, to);
        // Výsledok: pole 24 záznamov (0-23)
        int[] hourCounts = new int[24];
        for (Object[] row : rows) {
            int hour = ((Number) row[0]).intValue();
            int count = ((Number) row[1]).intValue();
            if (hour >= 0 && hour < 24) hourCounts[hour] = count;
        }

        List<Map<String, Object>> result = new ArrayList<>();
        for (int i = 0; i < 24; i++) {
            Map<String, Object> item = new LinkedHashMap<>();
            item.put("hour", i);
            item.put("label", String.format("%02d:00", i));
            item.put("count", hourCounts[i]);
            result.add(item);
        }
        return ResponseEntity.ok(result);
    }

    @GetMapping("/checkins/by-weekday")
    public ResponseEntity<?> checkinsByWeekday(
            @RequestParam(required = false) Integer days,
            @AuthenticationPrincipal UserDetails ud) {
        if (!isAdmin(ud)) return ResponseEntity.status(403).build();

        int d = days != null ? days : 90;
        LocalDateTime from = LocalDateTime.now().minusDays(d).withHour(0).withMinute(0).withSecond(0);
        LocalDateTime to = LocalDateTime.now();

        List<Object[]> rows = checkInRepository.countByDayOfWeek(from, to);
        String[] dayNames = {"Pondelok", "Utorok", "Streda", "Štvrtok", "Piatok", "Sobota", "Nedeľa"};
        int[] dayCounts = new int[7];
        for (Object[] row : rows) {
            // ISO day of week: 1=Mon ... 7=Sun
            int dow = ((Number) row[0]).intValue();
            int count = ((Number) row[1]).intValue();
            if (dow >= 1 && dow <= 7) dayCounts[dow - 1] = count;
        }

        List<Map<String, Object>> result = new ArrayList<>();
        for (int i = 0; i < 7; i++) {
            Map<String, Object> item = new LinkedHashMap<>();
            item.put("dayOfWeek", i + 1);
            item.put("dayName", dayNames[i]);
            item.put("count", dayCounts[i]);
            result.add(item);
        }
        return ResponseEntity.ok(result);
    }

    @GetMapping("/checkins/daily")
    public ResponseEntity<?> dailyCheckins(
            @RequestParam(required = false) Integer days,
            @AuthenticationPrincipal UserDetails ud) {
        if (!isAdmin(ud)) return ResponseEntity.status(403).build();

        int d = days != null ? days : 30;
        LocalDateTime from = LocalDateTime.now().minusDays(d).withHour(0).withMinute(0).withSecond(0);
        LocalDateTime to = LocalDateTime.now();

        List<Object[]> rows = checkInRepository.countByDay(from, to);
        List<Map<String, Object>> result = new ArrayList<>();
        for (Object[] row : rows) {
            Map<String, Object> item = new LinkedHashMap<>();
            item.put("date", row[0] != null ? row[0].toString() : "—");
            item.put("count", ((Number) row[1]).intValue());
            result.add(item);
        }
        return ResponseEntity.ok(result);
    }

    // ── 8. Kombinovaný prehľad (celkový dashboard) ───────────────────────────
    @GetMapping("/dashboard")
    public ResponseEntity<?> dashboardOverview(@AuthenticationPrincipal UserDetails ud) {
        if (!isAdmin(ud)) return ResponseEntity.status(403).build();

        LocalDateTime now = LocalDateTime.now();
        LocalDateTime monthStart = now.withDayOfMonth(1).withHour(0).withMinute(0).withSecond(0);
        LocalDateTime lastMonthStart = monthStart.minusMonths(1);
        LocalDateTime lastMonthEnd = monthStart.minusSeconds(1);

        // Recepčné tržby tento mesiac vs minulý
        Long receptionThisMonth = receptionSaleRepository.totalRevenueCents(monthStart, now);
        Long receptionLastMonth = receptionSaleRepository.totalRevenueCents(lastMonthStart, lastMonthEnd);
        Long receptionTxThisMonth = receptionSaleRepository.countSales(monthStart, now);

        // Membership obrat tento mesiac
        YearMonth ym = YearMonth.now();
        List<Membership> membershipsThisMonth = membershipRepository.findByStartMonth(ym.getYear(), ym.getMonthValue());
        double membershipRevenueThisMonth = membershipsThisMonth.stream()
                .mapToDouble(mem -> mem.getMembershipType() != null ? mem.getMembershipType().getPriceEuros() : 0.0)
                .sum();

        YearMonth prevYm = ym.minusMonths(1);
        List<Membership> membershipsLastMonth = membershipRepository.findByStartMonth(prevYm.getYear(), prevYm.getMonthValue());
        double membershipRevenueLastMonth = membershipsLastMonth.stream()
                .mapToDouble(mem -> mem.getMembershipType() != null ? mem.getMembershipType().getPriceEuros() : 0.0)
                .sum();

        // Check-ins tento mesiac
        long checkinsThisMonth = checkInRepository.findByCheckedInAtBetweenOrderByCheckedInAtDesc(monthStart, now).size();
        long checkinsLastMonth = checkInRepository.findByCheckedInAtBetweenOrderByCheckedInAtDesc(lastMonthStart, lastMonthEnd).size();

        // Celkový obrat = permanentky + recepcia
        double totalRevenueThisMonth = membershipRevenueThisMonth + (receptionThisMonth / 100.0);
        double totalRevenueLastMonth = membershipRevenueLastMonth + (receptionLastMonth / 100.0);

        // Aktívne permanentky
        List<Membership> activeMembs = membershipRepository.findAllActiveAndValid(LocalDate.now());

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("totalRevenueThisMonth", Math.round(totalRevenueThisMonth * 100.0) / 100.0);
        result.put("totalRevenueLastMonth", Math.round(totalRevenueLastMonth * 100.0) / 100.0);
        result.put("membershipRevenueThisMonth", Math.round(membershipRevenueThisMonth * 100.0) / 100.0);
        result.put("membershipRevenueLastMonth", Math.round(membershipRevenueLastMonth * 100.0) / 100.0);
        result.put("receptionRevenueThisMonth", Math.round(receptionThisMonth / 100.0 * 100.0) / 100.0);
        result.put("receptionRevenueLastMonth", Math.round(receptionLastMonth / 100.0 * 100.0) / 100.0);
        result.put("receptionTransactionsThisMonth", receptionTxThisMonth);
        result.put("checkinsThisMonth", checkinsThisMonth);
        result.put("checkinsLastMonth", checkinsLastMonth);
        result.put("activeMemberships", activeMembs.size());
        result.put("newMembershipsThisMonth", membershipsThisMonth.size());
        return ResponseEntity.ok(result);
    }

    // ── Pomocné ───────────────────────────────────────────────────────────────

    private boolean isAdmin(UserDetails ud) {
        if (ud == null) return false;
        User caller = userRepository.findByEmail(ud.getUsername()).orElse(null);
        return caller != null && "admin".equalsIgnoreCase(caller.getRole());
    }
}