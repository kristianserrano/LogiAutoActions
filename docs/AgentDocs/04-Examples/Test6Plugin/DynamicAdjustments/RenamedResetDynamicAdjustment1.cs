namespace Loupedeck.Test4Plugin
{
    using System;

    public class RenamedResetDynamicAdjustment1 : PluginDynamicAdjustment
    {
        private readonly RenamedResetDynamicAdjustmentFakeVolume _fakeVolume = new();

        public RenamedResetDynamicAdjustment1()
            : base("Fake Volume", "An example adjustment with a renamed 'reset' command (without parameters)", "Test", true)
        {
            this.ResetDisplayName = "Mute Fake Volume";
            this.ResetGroupName = $"Test{CommonStrings.SubgroupSeparator}Reset";
        }

        protected override void ApplyAdjustment(String actionParameter, Int32 ticks)
        {
            if (this._fakeVolume.ApplyAdjustment(ticks))
            {
                this.AdjustmentValueChanged();
            }
        }

        protected override void RunCommand(String actionParameter)
        {
            if (this._fakeVolume.RunCommand())
            {
                this.AdjustmentValueChanged();
            }
        }

        protected override String GetAdjustmentValue(String actionParameter) => this._fakeVolume.GetAdjustmentValue();
    }
}