package com.basebandit.zeus.notifications.service;

import com.basebandit.zeus.notifications.config.AppProperties;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

/** Thin wrapper over {@link JavaMailSender} that applies the configured "from" address. */
@Service
public class EmailService {

    private final JavaMailSender mailSender;
    private final String from;

    public EmailService(JavaMailSender mailSender, AppProperties props) {
        this.mailSender = mailSender;
        this.from = props.getMail().getFrom();
    }

    public void send(String to, String subject, String body) {
        SimpleMailMessage message = new SimpleMailMessage();
        message.setFrom(from);
        message.setTo(to);
        message.setSubject(subject);
        message.setText(body);
        mailSender.send(message);
    }
}
