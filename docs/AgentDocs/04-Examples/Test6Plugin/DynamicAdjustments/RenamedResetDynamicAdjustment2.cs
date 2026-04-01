namespace Loupedeck.Test4Plugin
{
    using System;
    using System.Collections.Generic;

    public class RenamedResetDynamicAdjustment2 : PluginDynamicAdjustment
    {
        private readonly Dictionary<String, RenamedResetDynamicAdjustmentFakeVolume> _fakeChannels = new();

        public RenamedResetDynamicAdjustment2()
            : base(true)
        {
            this.DisplayName = "Fake Channel";
            this.GroupName = "Test";
            this.ResetDisplayName = "Mute Fake Channel";
            this.ResetGroupName = $"Test{CommonStrings.SubgroupSeparator}Reset";
            this.Description = "An example adjustment with a renamed 'reset' command (with parameters)";

            for (var channelNumber = 1; channelNumber <= 3; channelNumber++)
            {
                var parameterName = $"channel{channelNumber}";
                var parameter = this.AddParameter(parameterName, $"Fake Channel {channelNumber} Volume", this.GroupName);
                parameter.ResetDisplayName = $"Mute Fake Channel {channelNumber}";
                parameter.ResetGroupName = this.ResetGroupName;

                this._fakeChannels[parameterName] = new();
            }
        }

        protected override void ApplyAdjustment(String actionParameter, Int32 ticks)
        {
            if (this._fakeChannels.TryGetValue(actionParameter, out var channel) && channel.ApplyAdjustment(ticks))
            {
                this.AdjustmentValueChanged(actionParameter);
            }
        }

        protected override void RunCommand(String actionParameter)
        {
            if (this._fakeChannels.TryGetValue(actionParameter, out var channel) && channel.RunCommand())
            {
                this.AdjustmentValueChanged(actionParameter);
            }
        }

        protected override String GetAdjustmentValue(String actionParameter) => this._fakeChannels.TryGetValue(actionParameter, out var channel) ? channel.GetAdjustmentValue() : null;
    }
}