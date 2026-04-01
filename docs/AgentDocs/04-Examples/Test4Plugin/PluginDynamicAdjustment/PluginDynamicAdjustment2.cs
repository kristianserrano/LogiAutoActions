namespace Loupedeck.Test4Plugin
{
    using System;
    using System.Collections.Generic;

    class PluginDynamicAdjustment2 : PluginDynamicAdjustment
    {
        private readonly Dictionary<String, Int32> _values = new Dictionary<String, Int32>();

        public PluginDynamicAdjustment2() : base(true)
        {
            AddParameter("R");
            AddParameter("G");
            AddParameter("B");

            void AddParameter(String name)
            {
                this.AddParameter(name, name, "Test");
                this._values[name] = 128;
            }
        }

        protected override void RunCommand(String actionParameter)
        {
            this._values[actionParameter] = 128;

            this.AdjustmentValueChanged(actionParameter);
        }

        protected override void ApplyAdjustment(String actionParameter, Int32 diff)
        {
            var value = this._values[actionParameter] + diff;
            this._values[actionParameter] = Helpers.MinMax(value, 0, 255);

            this.AdjustmentValueChanged(actionParameter);
        }

        protected override String GetAdjustmentValue(String actionParameter) => $"{this._values[actionParameter]}";
    }
}
