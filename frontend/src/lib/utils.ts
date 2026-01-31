import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs))
}

export function debounce<A extends unknown[], R>(
    func: (...args: A) => R,
    wait: number
): ((...args: A) => void) & { cancel: () => void } {
    let timeout: ReturnType<typeof setTimeout> | null = null;

    // Using a cast to match the signature including the cancel method
    const debounced = (...args: A) => {
        if (timeout) clearTimeout(timeout);
        timeout = setTimeout(() => {
            func(...args);
        }, wait);
    };

    debounced.cancel = () => {
        if (timeout) {
            clearTimeout(timeout);
            timeout = null;
        }
    };

    return debounced as ((...args: A) => void) & { cancel: () => void };
}
