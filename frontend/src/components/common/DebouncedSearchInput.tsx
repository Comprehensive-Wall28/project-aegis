import { useState, useEffect, useCallback } from 'react';
import { TextField, InputAdornment, IconButton } from '@mui/material';
import { Search as SearchIcon, Clear as ClearIcon } from '@mui/icons-material';
import type { TextFieldProps } from '@mui/material';

interface DebouncedSearchInputProps extends Omit<TextFieldProps, 'onChange' | 'value'> {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    debounceMs?: number;
}

export function DebouncedSearchInput({
    value,
    onChange,
    placeholder = 'Search...',
    debounceMs = 300,
    ...textFieldProps
}: DebouncedSearchInputProps) {
    const [inputValue, setInputValue] = useState(value);

    // Update input when external value changes
    useEffect(() => {
        setInputValue(value);
    }, [value]);

    // Debounce the onChange callback
    useEffect(() => {
        const timer = setTimeout(() => {
            if (inputValue !== value) {
                onChange(inputValue);
            }
        }, debounceMs);

        return () => clearTimeout(timer);
    }, [inputValue, onChange, value, debounceMs]);

    const handleClear = useCallback(() => {
        setInputValue('');
        onChange('');
    }, [onChange]);

    return (
        <TextField
            {...textFieldProps}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder={placeholder}
            InputProps={{
                startAdornment: (
                    <InputAdornment position="start">
                        <SearchIcon sx={{ color: 'text.secondary', fontSize: 20 }} />
                    </InputAdornment>
                ),
                endAdornment: inputValue && (
                    <InputAdornment position="end">
                        <IconButton
                            onClick={handleClear}
                            edge="end"
                            size="small"
                            sx={{ color: 'text.secondary' }}
                        >
                            <ClearIcon sx={{ fontSize: 18 }} />
                        </IconButton>
                    </InputAdornment>
                ),
                ...textFieldProps.InputProps,
            }}
        />
    );
}

export default DebouncedSearchInput;
