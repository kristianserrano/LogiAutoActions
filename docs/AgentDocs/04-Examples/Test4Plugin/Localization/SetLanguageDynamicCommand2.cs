namespace Loupedeck.Test4Plugin
{
    using System;

    public class SetLanguageDynamicCommand2 : PluginDynamicCommand
    {
        public SetLanguageDynamicCommand2()
        {
        }

        protected override Boolean OnLoad()
        {
            foreach (var language in new[] { "en-US", "de-DE", "fr-FR", "xx-XX" })
            {
                this.AddParameter(language, $"Change to '{language}' (plugin)", "Localization - plugin");
            }

            return true;
        }

        protected override void RunCommand(String actionParameter)
        {
            var oldLanguage = this.Plugin.Localization.CurrentLanguage;
            this.Plugin.Localization.SetCurrentLanguage(actionParameter);
            this.Plugin.OnPluginStatusChanged(PluginStatus.Warning, $"Plugin language: '{oldLanguage}' -> '{actionParameter}' ? '{this.Plugin.Localization.CurrentLanguage}'", null, null);
        }
    }
}
