namespace Loupedeck.Test4Plugin
{
    using System;

    public class ListProfileDynamicAction : PluginDynamicCommand
    {
        private readonly String[] _names = new[] { "Charlotte Miller", "Liam Smith", "Olivia Johnson", "Noah Williams", "Emma Brown", "Elijah Jones" };

        public ListProfileDynamicAction()
        {
            this.DisplayName = "Select Employee";
            this.GroupName = "Select Employee";

            foreach (var name in this._names)
            {
                this.AddParameter(name, name, this.GroupName);
            }

            this.MakeProfileAction("list");
        }

        protected override void RunCommand(String actionParameter) => this.NativeApi.GetNativeMethods().SendString(actionParameter);
    }
}