/** @jsx jsx */
import { jsx, css, SerializedStyles } from "@emotion/core";
import { useState, useEffect, Fragment } from "react";
import { ValidationResult, ValidationResultType } from "@reactway/forms-core";
import { useFieldContext, useFieldId } from "@reactway/forms";
import debounce from "lodash.debounce";

interface Theme {
    colorError: string;
    colorWarning: string;
    fontSize: string;
    spacing: string;
}

const defaultTheme = {
    colorError: "#C32919",
    colorWarning: "#FF6E3C",
    fontSize: "0.875rem",
    spacing: "0.5rem"
};

export const validationResultStyles = (theme: Theme): SerializedStyles => css`
    display: flex;
    font-size: ${theme.fontSize};
    margin-top: ${theme.spacing};
    color: ${theme.colorError};

    [data-type="Warning"] {
        color: ${theme.colorWarning};
    }
`;

export const DefaultValidationResultComponent: ValidationResultComponent = (props) => {
    const { validationResult } = props;

    return (
        <span
            key={validationResult.message}
            css={validationResultStyles(props.theme ?? defaultTheme)}
            data-type={ValidationResultType[validationResult.type]}
        >
            {validationResult.message}
        </span>
    );
};

export interface ValidationResultComponentProps {
    validationResult: ValidationResult;
    theme?: Theme;
}

export type ValidationResultComponent = (props: ValidationResultComponentProps) => JSX.Element | null;

// TODO: Better naming?
export type ValidationResultRender = { [validationResultCode: string]: ValidationResultComponent | undefined };

interface Props {
    fieldName: string;
    validationResultRender?: ValidationResultRender;
}

export const FormFieldValidationContainer = (props: Props): JSX.Element | null => {
    const { validationResultRender = {} } = props;
    const { parentId, store } = useFieldContext();
    const fieldId = useFieldId(props.fieldName, parentId);

    const [results, setResults] = useState<ReadonlyArray<ValidationResult>>();
    useEffect(() => {
        const updateErrors = debounce(
            (): void => {
                const fieldState = store.helpers.selectField(fieldId);

                if (fieldState == null || !fieldState.status.touched) {
                    return;
                }

                setResults(fieldState.validation.results);
            },
            150,
            {
                leading: false,
                trailing: true
            }
        );
        updateErrors();

        return store.addListener(() => {
            updateErrors();
        }, [`${fieldId}.validation`, `${fieldId}.status`]);
        // Needs to update on every store change.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [store.helpers]);

    if (results == null) {
        return null;
    }

    return (
        <Fragment>
            {results.map((validationResult) => {
                const code = validationResult.code;
                if (code != null && validationResultRender[code] != null) {
                    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion, @typescript-eslint/no-unused-vars
                    const Component = validationResultRender[code]!;

                    return <Component key={validationResult.message} validationResult={validationResult} />;
                }

                return <DefaultValidationResultComponent key={validationResult.message} validationResult={validationResult} />;
            })}
        </Fragment>
    );
};
