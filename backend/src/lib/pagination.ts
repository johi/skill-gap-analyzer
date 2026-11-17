export function pagination<T extends number>(page: number, pageSize: T, totalItems: number) {
    const totalPages = Math.ceil(totalItems / pageSize);
    return { page: Math.min(page, Math.max(1, totalPages)), pageSize, totalItems, totalPages };
}
