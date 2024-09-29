export const getUserData = () => {
    return new Promise<string>((resolve) => {
        setTimeout(() => {
            resolve("Nigel");
        }, 5000);
    });
};