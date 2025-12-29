export const getUserData = () => {
    return new Promise<string>((resolve) => {
        setTimeout(() => {
            resolve("Smoker");
        }, 5000);
    });
};