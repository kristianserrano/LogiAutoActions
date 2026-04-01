namespace Loupedeck.Test4Plugin
{
    using System;

    public class LocalizationDynamicCommand2 : PluginDynamicCommand
    {
        public LocalizationDynamicCommand2()
            : base("##LanguageName", "##LanguageDescription", "##LanguageGroupName")
        {
        }

        protected override void RunCommand(String actionParameter)
            => this.Plugin.OnPluginStatusChanged(PluginStatus.Warning, "##LanguageStatusMessage", "##LanguageStatusUrl", "##LanguageStatusUrlText");
    }
}
