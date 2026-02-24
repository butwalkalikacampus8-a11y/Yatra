/**
 * Mock SMS Service
 * In production, replace this with Twilio, SparrowSMS, or AakashSMS integration.
 */
export const sendSMS = async (to: string, message: string): Promise<boolean> => {
    // eslint-disable-next-line no-console
    console.log(`[SMS MOCK] 📨 Sending SMS to ${to}: "${message}"`);

    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 500));

    return true;
};
