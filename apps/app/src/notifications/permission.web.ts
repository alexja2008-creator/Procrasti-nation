// The web has no reminders until Web Push (the next feature), so it never asks.
export type Permission = 'granted' | 'denied' | 'undetermined' | 'unsupported';

export const getPermission = async (): Promise<Permission> => 'unsupported';

export const requestPermission = async (): Promise<Permission> => 'unsupported';
