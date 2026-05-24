using System;
using System.Globalization;
using System.Windows;
using System.Windows.Data;

namespace GamesNexus.Views
{
    public class StringToUpperConverter : IValueConverter
    {
        public object Convert(object value, Type targetType, object parameter, CultureInfo culture)
        {
            string text = value as string;
            if (string.IsNullOrEmpty(text))
                return string.Empty;

            return text.ToUpper(culture);
        }

        public object ConvertBack(object value, Type targetType, object parameter, CultureInfo culture)
        {
            throw new NotSupportedException();
        }
    }

    public class PercentageToWidthConverter : IMultiValueConverter
    {
        public object Convert(
            object[] values,
            Type targetType,
            object parameter,
            CultureInfo culture)
        {
            if (values.Length < 2)
                return 0.0;

            double percentage = 0;
            double maxWidth = 0;

            double.TryParse(values[0]?.ToString(), out percentage);
            double.TryParse(values[1]?.ToString(), out maxWidth);

            percentage = Math.Max(0, Math.Min(100, percentage));

            return (percentage / 100.0) * maxWidth;
        }

        public object[] ConvertBack(
            object value,
            Type[] targetTypes,
            object parameter,
            CultureInfo culture)
        {
            throw new NotSupportedException();
        }
    }
}