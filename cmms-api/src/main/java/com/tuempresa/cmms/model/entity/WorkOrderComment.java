package com.tuempresa.cmms.model.entity;

import com.tuempresa.cmms.tenant.BaseTenantEntity;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

@Entity
@Table(name = "work_order_comments")
@Getter
@Setter
public class WorkOrderComment extends BaseTenantEntity {

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "work_order_id", nullable = false)
    private WorkOrder workOrder;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "author_id", nullable = false)
    private User author;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String content;

    /**
     * Copia fiel de Comment.MENTION_PATTERN real: reconoce las menciones
     * con el formato que guarda el editor, "@[Nombre](user:5)".
     */
    private static final java.util.regex.Pattern MENTION_PATTERN =
            java.util.regex.Pattern.compile("@\\[.*?\\]\\(user:(\\d+)\\)");

    /** Ids de los usuarios mencionados, para notificarlos. */
    public java.util.Set<Long> extractTaggedUserIds() {
        java.util.Set<Long> ids = new java.util.HashSet<>();
        if (content == null) return ids;
        var matcher = MENTION_PATTERN.matcher(content);
        while (matcher.find()) {
            ids.add(Long.parseLong(matcher.group(1)));
        }
        return ids;
    }

    /** El texto sin el formato tecnico: "@[Ana](user:5)" queda como "@Ana". */
    public String getFormattedContent() {
        if (content == null) return null;
        return content.replaceAll("@\\[(.*?)\\]\\(user:(\\d+)\\)", "@$1");
    }
}
