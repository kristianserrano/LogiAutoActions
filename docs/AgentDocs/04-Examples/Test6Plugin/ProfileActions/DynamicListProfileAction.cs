namespace Loupedeck.Test6Plugin
{
    using System;

    public class DynamicListProfileAction : PluginDynamicCommand
    {

        public DynamicListProfileAction()
        {
            this.DisplayName = "DynamicListProfileAction";
            this.GroupName = "Profile Actions";

            this.MakeProfileAction("list");

            for (var i = 0; i < 5; i++)
            {
                this.AddParameter($"item{i}", $"Item {i}", this.GroupName);
            }
        }

        protected override void RunCommand(String actionParameter) => this.Plugin.OnPluginStatusChanged(PluginStatus.Warning, actionParameter, null, null);
    }
}