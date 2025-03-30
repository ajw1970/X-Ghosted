import { debounce } from './debounce';

describe('debounce', () => {
    let func;
    let debouncedFunc;

    beforeEach(() => {
        func = vi.fn();
        debouncedFunc = debounce(func, 1000);
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.clearAllMocks();
        vi.useRealTimers();
    });

    test('should call the function after the specified wait time', () => {
        debouncedFunc();
        expect(func).not.toHaveBeenCalled();
        vi.advanceTimersByTime(1000);
        expect(func).toHaveBeenCalledTimes(1);
    });

    test('should not call the function before the wait time', () => {
        debouncedFunc();
        vi.advanceTimersByTime(500);
        expect(func).not.toHaveBeenCalled();
    });

    test('should call the function only once if called multiple times within the wait time', () => {
        debouncedFunc();
        debouncedFunc();
        debouncedFunc();
        vi.advanceTimersByTime(1000);
        expect(func).toHaveBeenCalledTimes(1);
    });

    test('should call the function again if called after the wait time', () => {
        debouncedFunc();
        vi.advanceTimersByTime(1000);
        expect(func).toHaveBeenCalledTimes(1);
        debouncedFunc();
        vi.advanceTimersByTime(1000);
        expect(func).toHaveBeenCalledTimes(2);
    });

    test('should pass arguments to the original function', () => {
        debouncedFunc('arg1', 42);
        vi.advanceTimersByTime(1000);
        expect(func).toHaveBeenCalledWith('arg1', 42);
    });

    test('should use the last arguments when called multiple times within wait time', () => {
        debouncedFunc('first');
        debouncedFunc('second');
        debouncedFunc('third');
        vi.advanceTimersByTime(1000);
        expect(func).toHaveBeenCalledWith('third');
    });

    test('should handle immediate call after previous debounce completes', () => {
        debouncedFunc('first');
        vi.advanceTimersByTime(1000);
        expect(func).toHaveBeenCalledWith('first');
        debouncedFunc('second');
        vi.advanceTimersByTime(1000);
        expect(func).toHaveBeenCalledWith('second');
    });

    test('should call immediately if wait time is 0', () => {
        const instantDebounce = debounce(func, 0);
        instantDebounce();
        expect(func).toHaveBeenCalledTimes(1);
    });
});