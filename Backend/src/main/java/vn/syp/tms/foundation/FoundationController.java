package vn.syp.tms.foundation;

import jakarta.validation.Valid;
import org.springframework.context.annotation.Profile;
import org.springframework.http.HttpStatus;
import org.springframework.security.web.csrf.CsrfToken;
import org.springframework.web.bind.annotation.*;

@RestController
@Profile("local")
@RequestMapping("/api/v1/system")
public class FoundationController {
    private final FoundationService service;
    public FoundationController(FoundationService service) { this.service = service; }

    @GetMapping("/status")
    public FoundationDtos.Status status() { return service.status(); }
    @GetMapping("/checks")
    public FoundationDtos.CheckPage checks() { return service.checks(); }
    @PostMapping("/checks")
    @ResponseStatus(HttpStatus.CREATED)
    public FoundationDtos.Check create(@Valid @RequestBody FoundationDtos.CreateCheck request) {
        return service.create(request);
    }
    @GetMapping("/csrf")
    public FoundationDtos.Csrf csrf(CsrfToken token) {
        return new FoundationDtos.Csrf(token.getToken(), token.getHeaderName());
    }
}

