declare global {
    namespace Express {
        interface Request {
            user?: {
                id: string;
                role: 'ADMIN' | 'MANAGER' | 'STAFF';
            };
        }
    }
}

export {};
