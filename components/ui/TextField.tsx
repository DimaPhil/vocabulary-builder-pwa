import { forwardRef } from "react";
import { StyleSheet, TextInput, type TextInputProps, View } from "react-native";

import { Text } from "@/components/ui/Text";
import { useAppTheme } from "@/lib/theme";

type TextFieldProps = TextInputProps & {
  label: string;
  helperText?: string;
  error?: string;
};

export const TextField = forwardRef<TextInput, TextFieldProps>(
  ({ error, helperText, label, style, ...rest }, ref) => {
    const theme = useAppTheme();

    return (
      <View style={styles.wrapper}>
        <Text variant="label">{label}</Text>
        <TextInput
          accessibilityHint={error ?? helperText}
          accessibilityLabel={rest.accessibilityLabel ?? label}
          ref={ref}
          placeholderTextColor={theme.colors.textMuted}
          style={[
            styles.input,
            {
              backgroundColor: theme.colors.surfaceElevated,
              borderColor: error ? theme.colors.danger : theme.colors.border,
              color: theme.colors.text,
            },
            style,
          ]}
          {...rest}
        />
        {error ? (
          <Text color={theme.colors.danger} variant="caption">
            {error}
          </Text>
        ) : helperText ? (
          <Text color={theme.colors.textMuted} variant="caption">
            {helperText}
          </Text>
        ) : null}
      </View>
    );
  },
);

TextField.displayName = "TextField";

const styles = StyleSheet.create({
  wrapper: {
    gap: 6,
  },
  input: {
    borderRadius: 16,
    borderWidth: 1,
    fontSize: 16,
    minHeight: 52,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
});
