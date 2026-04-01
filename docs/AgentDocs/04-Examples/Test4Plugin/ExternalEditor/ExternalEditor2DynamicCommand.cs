namespace Loupedeck.Test4Plugin
{
    using System;

    public class ExternalEditor2DynamicCommand : PluginDynamicCommand
    {
        public ExternalEditor2DynamicCommand()
        {
            this.DisplayName = "External Editor 2";
            this.Description = "Click button to edit this action in an external editor";
            this.GroupName = "Test";

            this.EnableExternalEditor("Edit My Action");

            for (var i = 1; i <= 3; i++)
            {
                this.AddParameter($"{i}", $"External Editor 2 / {i}", this.GroupName);
            }
        }

        protected override Boolean TryOpenExternalEditor(String actionParameter)
        {
            this.Plugin.OnPluginStatusChanged(PluginStatus.Warning, $"External editor request received ({actionParameter})", null, null);
            return true;
        }

        protected override void RunCommand(String actionParameter) => this.Plugin.OnPluginStatusChanged(PluginStatus.Normal, "", null, null);
    }
}
