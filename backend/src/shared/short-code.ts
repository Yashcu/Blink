import { customAlphabet } from "nanoid";

const ALPHABET = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

const nanoid = customAlphabet(ALPHABET, 7);

export function generateShortCode(length = 7): string {
    if(length === 7){
        return nanoid();
    }

    return customAlphabet(ALPHABET, length)();
}
