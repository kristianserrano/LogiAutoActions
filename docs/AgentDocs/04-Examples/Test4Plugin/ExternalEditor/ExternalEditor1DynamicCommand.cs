namespace Loupedeck.Test4Plugin
{
    using System;

    public class ExternalEditor1DynamicCommand : PluginDynamicCommand
    {
        public ExternalEditor1DynamicCommand()
            : base("External Editor 1", "Click button to edit this action in an external editor", "Test")
            => this.EnableExternalEditor("Edit My Action");

        protected override Boolean TryOpenExternalEditor(String actionParameter)
        {
            this.Plugin.OnPluginStatusChanged(PluginStatus.Warning, "External editor request received", null, null);
            return true;
        }

        protected override void RunCommand(String actionParameter) => this.Plugin.OnPluginStatusChanged(PluginStatus.Normal, "", null, null);
    }
}
