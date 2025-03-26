import { jest } from '@jest/globals';
import { debounce } from './debounce';

jest.useFakeTimers();

describe('debounce', () => {
    let func;
    let debouncedFunc;

    beforeEach(() => {
        func = jest.fn();
        debouncedFunc = debounce(func, 1000);
    });

    test('should call the function after the specified wait time', () => {
        debouncedFunc();
        expect(func).not.toBeCalled();
        jest.advanceTimersByTime(1000);
        expect(func).toHaveBeenCalledTimes(1);
    });

    test('should not call the function before the wait time', () => {
        debouncedFunc();
        jest.advanceTimersByTime(500);
        expect(func).not.toBeCalled();
    });

    test('should call the function only once if called multiple times within the wait time', () => {
        debouncedFunc();
        debouncedFunc();
        debouncedFunc();
        jest.advanceTimersByTime(1000);
        expect(func).toHaveBeenCalledTimes(1);
    });

    test('should call the function again if called after the wait time', () => {
        debouncedFunc();
        jest.advanceTimersByTime(1000);
        expect(func).toHaveBeenCalledTimes(1);

        debouncedFunc();
        jest.advanceTimersByTime(1000);
        expect(func).toHaveBeenCalledTimes(2);
    });

    test('should pass arguments to the original function', () => {
        debouncedFunc('arg1', 42);
        jest.advanceTimersByTime(1000);
        expect(func).toHaveBeenCalledWith('arg1', 42);
    });

    test('should use the last arguments when called multiple times within wait time', () => {
        debouncedFunc('first');
        debouncedFunc('second');
        debouncedFunc('third');
        jest.advanceTimersByTime(1000);
        expect(func).toHaveBeenCalledWith('third');
        expect(func).toHaveBeenCalledTimes(1);
    });

    test('should handle immediate call after previous debounce completes', () => {
        debouncedFunc('first');
        jest.advanceTimersByTime(1000);
        expect(func).toHaveBeenCalledWith('first');

        debouncedFunc('second');
        jest.advanceTimersByTime(500);
        expect(func).toHaveBeenCalledTimes(1);
        jest.advanceTimersByTime(500);
        expect(func).toHaveBeenCalledTimes(2);
        expect(func).toHaveBeenLastCalledWith('second');
    });

    test('should call immediately if wait time is 0', () => {
        const instantDebounce = debounce(func, 0);
        instantDebounce();
        expect(func).toBeCalled();
    });
});