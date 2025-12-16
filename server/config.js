module.exports = {
    'secret': process.env.JWT_SECRET || (() => {
        if (process.env.NODE_ENV === 'production') {
            console.error('JWT_SECRET environment variable is required in production');
            process.exit(1);
        }
        return 'supersecret'; // Only for development
    })()
};