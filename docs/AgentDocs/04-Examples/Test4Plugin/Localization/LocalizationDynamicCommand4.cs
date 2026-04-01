namespace Loupedeck.Test4Plugin
{
    using System;
    using System.Globalization;

    using Loupedeck.Service;

    public class LocalizationDynamicCommand4 : PluginDynamicCommand
    {
        public LocalizationDynamicCommand4()
            : base("Language now", "", "Localization - service")
        {
        }

        protected override String GetCommandDisplayName(String actionParameter, PluginImageSize imageSize)
            => $"Language now: {this.Plugin.Localization.LoupedeckLanguage}/{LocalizationManager.Instance.CurrentLanguage}";
    }
}
