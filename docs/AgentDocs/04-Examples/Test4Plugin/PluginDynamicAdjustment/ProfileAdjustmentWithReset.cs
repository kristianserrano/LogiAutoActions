namespace Loupedeck.Test4Plugin
{
    using System;

    public class ProfileAdjustmentWithReset : PluginDynamicAdjustment
    {
        private readonly DictionaryNoCase<Int32> _counters = new DictionaryNoCase<Int32>();

        public ProfileAdjustmentWithReset() : base("Adjustment With Reset", "", "Test", true) => this.MakeProfileAction("text;Name:");

        protected override void ApplyAdjustment(String actionParameter, Int32 ticks)
        {
            if (!this._counters.ContainsKey(actionParameter))
            {
                this._counters[actionParameter] = 0;
            }

            this._counters[actionParameter] += ticks; // increase or decrease counter on the number of ticks
            this.AdjustmentValueChanged(actionParameter); // adjustment value has changed
        }

        protected override void RunCommand(String actionParameter)
        {
            if (!this._counters.ContainsKey(actionParameter))
            {
                this._counters[actionParameter] = 0;
            }

            this._counters[actionParameter] = 0; // increase or decrease counter on the number of ticks
            this.AdjustmentValueChanged(actionParameter); // adjustment value has changed
        }

        protected override String GetAdjustmentValue(String actionParameter)
        {
            if (!this._counters.ContainsKey(actionParameter))
            {
                this._counters[actionParameter] = 0;
            }

            return this._counters[actionParameter].ToString();
        }
    }
}
