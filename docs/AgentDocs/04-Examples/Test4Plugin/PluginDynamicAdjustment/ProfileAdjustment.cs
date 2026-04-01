namespace Loupedeck.Test4Plugin
{
    using System;

    public class ProfileAdjustment : PluginDynamicAdjustment
    {
        public ProfileAdjustment() : base(true)
        {
            this.DisplayName = "Mic/Aux";
            this.GroupName = "Test";

            this.AddParameter("Mic/Aux", "Mic/Aux", this.GroupName);
            this.AddParameter("Aux/Mic", "Aux/Mic", this.GroupName);
            this.AddParameter("/a/b/c/", "/a/b/c/", this.GroupName);

            this.MakeProfileAction("list");
        }

        protected override void ApplyAdjustment(String actionParameter, Int32 ticks)
        {
        }

        protected override void RunCommand(String actionParameter)
        {
        }
    }
}
