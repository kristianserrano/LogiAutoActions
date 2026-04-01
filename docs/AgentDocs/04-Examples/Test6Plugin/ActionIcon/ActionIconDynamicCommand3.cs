namespace Loupedeck.Test6Plugin
{
    using System;

    internal class ActionIconDynamicCommand3 : PluginDynamicCommand
    {
        public ActionIconDynamicCommand3()
        {
            this.GroupName = "Action Icon";

            for (var i = 1; i <= 3; i++)
            {
                this.AddParameter($"number{i}", $"Action Icon 3/{i}", this.GroupName);
            }
        }
    }
}