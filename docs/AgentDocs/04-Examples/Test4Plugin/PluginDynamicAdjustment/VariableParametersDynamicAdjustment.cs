namespace Loupedeck.Test4Plugin
{
    using System;

    public class VariableParametersDynamicAdjustment : PluginDynamicAdjustment
    {
        private Int32 _count = 3;

        public VariableParametersDynamicAdjustment()
            : base(false) // has no reset command
        {
            this.DisplayName = "Variable Parameters A";
            this.GroupName = "Variable Parameters A";

            // add an adjustment to change number of parameters
            this.AddParameter("!", "Param (+/-)", this.GroupName);

            for (var i = 1; i <= this._count; i++)
            {
                this.AddParameter(i.ToString(), $"Param {i}", this.GroupName);
            }
        }

        protected override void ApplyAdjustment(String actionParameter, Int32 diff)
        {
            if ("!" == actionParameter)
            {
                if (diff > 0)
                {
                    // increase number of parameters
                    this._count++;
                    this.AddParameter(this._count.ToString(), $"Param {this._count}", this.GroupName);

                    // report parameter count change
                    this.ParametersChanged();
                }
                else if ((diff < 0) && (this._count > 0))
                {
                    // decrease number of parameters
                    this.RemoveParameter(this._count.ToString());
                    this._count--;

                    // report parameter count change
                    this.ParametersChanged();
                }
            }
        }
    }
}
