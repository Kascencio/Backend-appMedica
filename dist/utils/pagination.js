export function parsePagination(q) {
    const page = Math.max(1, Number(q.page ?? 1));
    const pageSize = Math.min(100, Math.max(1, Number(q.pageSize ?? 20)));
    const skip = (page - 1) * pageSize;
    const take = pageSize;
    return { page, pageSize, skip, take };
}
export function buildMeta(total, page, pageSize) {
    const totalPages = Math.ceil(total / pageSize) || 1;
    return { total, page, pageSize, totalPages };
}
//# sourceMappingURL=pagination.js.map