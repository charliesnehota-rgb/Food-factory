declare module 'web-push' {
  export interface PushSubscription {
    endpoint: string;
    keys: { p256dh: string; auth: string };
  }
  export function setVapidDetails(subject: string, publicKey: string, privateKey: string): void;
  export function sendNotification(sub: PushSubscription, payload: string): Promise<unknown>;
  export function generateVAPIDKeys(): { publicKey: string; privateKey: string };
}
