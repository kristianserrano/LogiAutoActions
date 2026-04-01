namespace Loupedeck.Test4Plugin
{
    using System;

    using Loupedeck.Service;

    public class SetLanguageDynamicCommand1 : PluginDynamicCommand
    {
        public SetLanguageDynamicCommand1()
        {
        }

        protected override Boolean OnLoad()
        {
            foreach (var language in new[] { "en-US", "de-DE", "fr-FR", "xx-XX" })
            {
                this.AddParameter(language, $"Change to '{language}' (service)", "Localization - service");
            }

            return true;
        }

        protected override void RunCommand(String actionParameter)
        {
            var oldLanguage = LocalizationManager.Instance.CurrentLanguage;

            LocalizationManager.Instance.SetCurrentLanguage(actionParameter);
            this.Plugin.OnPluginStatusChanged(PluginStatus.Warning, $"Service language: '{oldLanguage}' -> '{actionParameter}' ? '{LocalizationManager.Instance.CurrentLanguage}'", null, null);
        }
    }
}
