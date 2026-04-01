namespace Loupedeck.Test4Plugin
{
    using System;

    public class VariableParametersDynamicCommand : PluginDynamicCommand
    {
        private Int32 _count = 3;

        public VariableParametersDynamicCommand()
        {
            this.DisplayName = "Variable Parameters C";
            this.GroupName = "Variable Parameters C";

            // add command to increase number of parameters
            this.AddParameter("+", "Param (+)", this.GroupName);

            // add command to decrease number of parameters
            this.AddParameter("-", "Param (-)", this.GroupName);

            for (var i = 1; i <= this._count; i++)
            {
                this.AddParameter(i.ToString(), $"Param {i}", this.GroupName);
            }
        }

        protected override void RunCommand(String actionParameter)
        {
            if ("+" == actionParameter)
            {
                // increase number of parameters
                this._count++;
                this.AddParameter(this._count.ToString(), $"Param {this._count}", this.GroupName);
            }
            else if (("-" == actionParameter) && (this._count > 0))
            {
                // decrease number of parameters
                this.RemoveParameter(this._count.ToString());
                this._count--;
            }
            else
            {
                // do nothing
                return;
            }

            // report parameter count change
            this.ParametersChanged();
        }
    }
}
