namespace Loupedeck.Test6Plugin
{
    using System;

    internal class ActionIconDynamicCommand5 : PluginDynamicCommand
    {
        public ActionIconDynamicCommand5()
        {
            this.DisplayName = "Action Icon 5";
            this.Description = "Action Icon 5 description";
            this.GroupName = "Action Icon";

            this.MakeProfileAction("list");

            for (var i = 0; i < 3; i++)
            {
                this.AddParameter($"number{i}", $"Action Icon 5/{i}", this.GroupName);
            }
        }
    }
}