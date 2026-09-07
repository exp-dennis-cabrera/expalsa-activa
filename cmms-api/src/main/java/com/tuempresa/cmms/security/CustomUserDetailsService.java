package com.tuempresa.cmms.security;

import com.tuempresa.cmms.model.entity.User;
import com.tuempresa.cmms.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class CustomUserDetailsService implements UserDetailsService {

    private final UserRepository userRepository;

    @Override
    public UserDetails loadUserByUsername(String email) {
        User user = userRepository.findByEmailWithRole(email)
                .orElseThrow(() -> new UsernameNotFoundException("Usuario no encontrado: " + email));
        return new CmmsUserDetails(user);
    }

    public UserDetails loadUserById(Long id) {
        User user = userRepository.findByIdWithRole(id)
                .orElseThrow(() -> new UsernameNotFoundException("Usuario no encontrado: id=" + id));
        return new CmmsUserDetails(user);
    }
}
