namespace Loupedeck.Test6Plugin
{
    using System;

    internal class DynamicAdjustmentWithIncreasingParameters : PluginDynamicAdjustment
    {
        private Double _counter = 0;

        public DynamicAdjustmentWithIncreasingParameters()
            : base(true)
        {
            this.GroupName = "Dynamic Adjustments With Increasing Parameters";

            this.AddParameter();
            this.AddParameter();
            this.AddParameter();
        }

        protected override void ApplyAdjustment(String actionParameter, Int32 ticks)
        {
        }

        protected override void RunCommand(String actionParameter)
        {
            this.AddParameter();
            this.ParametersChanged();
        }

        private void AddParameter()
        {
            this._counter += 1;
            this.AddParameter($"param{this._counter}", $"Parameter {this._counter}", this.GroupName);
        }
    }
}