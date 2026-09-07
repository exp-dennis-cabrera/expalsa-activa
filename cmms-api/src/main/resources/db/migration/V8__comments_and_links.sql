CREATE TABLE work_order_comments (
    id BIGSERIAL PRIMARY KEY,
    organization_id BIGINT NOT NULL REFERENCES organizations(id),
    work_order_id BIGINT NOT NULL REFERENCES work_orders(id),
    author_id BIGINT NOT NULL REFERENCES users(id),
    content TEXT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT now(),
    updated_at TIMESTAMP NOT NULL DEFAULT now()
);
CREATE INDEX idx_wo_comments_wo ON work_order_comments(work_order_id);

CREATE TABLE work_order_links (
    id BIGSERIAL PRIMARY KEY,
    work_order_id BIGINT NOT NULL REFERENCES work_orders(id),
    linked_work_order_id BIGINT NOT NULL REFERENCES work_orders(id)
);
CREATE INDEX idx_wo_links_wo ON work_order_links(work_order_id);
CREATE INDEX idx_wo_links_linked ON work_order_links(linked_work_order_id);
