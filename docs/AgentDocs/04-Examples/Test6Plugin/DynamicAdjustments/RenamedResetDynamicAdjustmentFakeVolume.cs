namespace Loupedeck.Test4Plugin
{
    using System;

    internal class RenamedResetDynamicAdjustmentFakeVolume
    {
        private Int32 _level = 0;
        private Boolean _isMuted = false;

        public RenamedResetDynamicAdjustmentFakeVolume()
        {
        }

        public Boolean ApplyAdjustment(Int32 ticks)
        {
            var level = this._level + ticks;
            level = Helpers.MinMax(level, 0, 100); // level can be between 0 and 100

            if (level == this._level)
            {
                return false;
            }

            this._level = level;
            return true;
        }

        public Boolean RunCommand()
        {
            this._isMuted = !this._isMuted;
            return true;
        }

        public String GetAdjustmentValue() => this._isMuted ? "x" : this._level.ToString();
    }
}