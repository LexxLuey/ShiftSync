import type { AxiosError } from 'axios'
import type { NormalizedApiError } from '@/lib/api/types'

const isNonEmptyString = (value: unknown): value is string =>
    typeof value === 'string' && value.trim().length > 0

const toSuggestionList = (value: unknown): string[] => {
    if (!Array.isArray(value)) {
        return []
    }

    return value.filter(isNonEmptyString)
}

const toSeverity = (value: unknown): NormalizedApiError['severity'] => {
    if (
        value === 'info' ||
        value === 'warning' ||
        value === 'error' ||
        value === 'critical'
    ) {
        return value
    }

    return 'error'
}

const AxiosResponseIntrceptorErrorCallback = (
    error: AxiosError,
): NormalizedApiError => {
    const responseData = error.response?.data as
        | Record<string, unknown>
        | undefined
    const nestedError =
        responseData && typeof responseData.error === 'object'
            ? (responseData.error as Record<string, unknown>)
            : undefined

    const code = nestedError?.code ?? responseData?.code
    const message = nestedError?.message ?? responseData?.message
    const severity = nestedError?.severity ?? responseData?.severity
    const suggestions = nestedError?.suggestions ?? responseData?.suggestions
    const details = nestedError?.details ?? responseData?.details
    const violations = nestedError?.violations ?? responseData?.violations

    return {
        code: isNonEmptyString(code) ? code : 'UNKNOWN_ERROR',
        message: isNonEmptyString(message)
            ? message
            : error.message || 'An unexpected error occurred.',
        details: details ?? null,
        severity: toSeverity(severity),
        suggestions: toSuggestionList(suggestions),
        violations: Array.isArray(violations)
            ? (violations as NormalizedApiError['violations'])
            : undefined,
        status: error.response?.status,
    }
}

export default AxiosResponseIntrceptorErrorCallback
