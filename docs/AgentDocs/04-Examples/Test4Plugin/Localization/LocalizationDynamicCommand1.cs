namespace Loupedeck.Test4Plugin
{
    using System;
    using System.Globalization;

    using Loupedeck.Service;

    public class LocalizationDynamicCommand1 : PluginDynamicCommand
    {
        public LocalizationDynamicCommand1()
            : base("Language event", "", "Localization - service")
        {
        }

        protected override Boolean OnLoad()
        {
            LocalizationManager.Instance.LanguageChanged += this.OnLoupedeckLanguageChanged;
            return true;
        }

        protected override Boolean OnUnload()
        {
            LocalizationManager.Instance.LanguageChanged -= this.OnLoupedeckLanguageChanged;
            return true;
        }

        private void OnLoupedeckLanguageChanged(Object sender, LanguageChangedEventArgs e)
        {
            this.DisplayName = $"Language event: {e.PluginName}/{e.Language} ({this.Plugin.Localization.LoupedeckLanguage}/{LocalizationManager.Instance.CurrentLanguage})";
            this.ActionImageChanged();
        }
    }
}
